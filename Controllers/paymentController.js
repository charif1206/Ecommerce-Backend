// Import required dependencies and models
const generateTokenAndSetCookies = require("../middleware/generateTokenAndSetCookies");
const { Cart } = require("../Models/Cart");
const { Coupon } = require("../Models/Coupon");
const Order = require("../Models/Order");
const { User } = require("../Models/User");
const stripe = require("../utils/stripe");

/**
 * Creates a Stripe checkout session for product purchases
 * @route POST /payments/create-checkout-session
 * @access Private (requires login)
 */
module.exports.createCheckoutSession = async (req, res) => {
    // Extract coupon code from request body and user ID from authenticated request
    const { couponCode } = req.body;
    const userId = req.user.userId;

    // Fetch user's cart with product details
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || !cart.items?.length) {
        return res.status(400).json({ error: "Cart is empty" });
    }

    // Validate and apply coupon if provided
    let discountValue = 0;
    if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode, user: userId });
        if (coupon) {
            // Check if cart total meets minimum purchase requirement
            if (cart.totalPrice < coupon.minimumPurchase) {
                return res.status(400).json({
                    error: `Minimum purchase of $${coupon.minimumPurchase} required`,
                });
            }
            discountValue = coupon.value;
        }
    }

    // Calculate final price and prepare line items for Stripe
    const finalTotal = cart.totalPrice - discountValue;
    //
    const line_items = cart.items.map((item) => {
        // Distribute discount proportionally across all items
        const itemTotal = item.price * item.quantity;
        const discountShare = (itemTotal / cart.totalPrice) * discountValue;
        const adjustedPrice = (itemTotal - discountShare) / item.quantity;

        return {
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.productId.name,
                    images: item.productId.productImages?.map((img) => img.url) || [],
                },
                unit_amount: Math.round(adjustedPrice * 100), // Convert to cents for Stripe
            },
            quantity: item.quantity,
        };
    });

    // Create Stripe checkout session with all necessary parameters
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items,
        mode: "payment",
        success_url: "http://localhost:5173/order-success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "http://localhost:5173/cart",
        metadata: {
            userId: userId.toString(),
            couponCode: couponCode || "",
            cartId: cart._id.toString(),
            purchaseType: "product",
        },
    });

    // Return session details to the client
    res.status(200).json({
        id: session.id,
        totalAmount: finalTotal,
        url: session.url,
    });
};

/**
 * Creates a Stripe checkout session for seller account upgrade ($300 fixed price)
 * @route POST /payments/create-seller-upgrade
 * @access Private (requires login)
 */
module.exports.createSellerUpgrade = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);

        // Prevent duplicate upgrades
        if (user.roles === "seller") {
            return res.status(400).json({ error: "Already a seller" });
        }

        // Create Stripe checkout session for seller upgrade
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Premium Seller Package",
                            description: "One-time payment for seller privileges",
                        },
                        unit_amount: 30000, // $300 in cents
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url:
                "http://localhost:5173/seller-upgrade-success?session_id={CHECKOUT_SESSION_ID}",
            cancel_url: `http://localhost:5173/profile/${userId}`,
            metadata: {
                userId: userId,
                purchaseType: "seller_upgrade",
            },
        });

        // Return session details to the client
        res.status(200).json({
            id: session.id,
            url: session.url,
        });
    } catch (error) {
        console.error("Upgrade error:", error);
        res.status(500).json({ error: "Upgrade failed" });
    }
};

/**
 * Unified success handler for both product purchases and seller upgrades
 * Processes the completed payment and updates database accordingly
 * @route POST /payments/checkout-success
 * @access Private (requires login)
 */
module.exports.checkoutSuccess = async (req, res) => {
    // Extract session ID from request
    const { sessionId } = req.body;

    // Retrieve session details from Stripe to verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify payment was successful
    if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "Payment not completed" });
    }

    // ROUTE 1: Handle Seller Upgrade
    if (session.metadata.purchaseType === "seller_upgrade") {
        // Update user role to seller in the database
        await User.findByIdAndUpdate(session.metadata.userId, {
            roles: "seller",
        });

        // Generate a new token with updated role and set it as a cookie
        const newToken = generateTokenAndSetCookies(res, session.metadata.userId, "seller");

        return res.status(200).json({
            message: "Seller account upgraded successfully!",
            token: newToken,
        });
    }

    // ROUTE 2: Handle Product Purchase
    // Find user's cart with product details
    const cart = await Cart.findOne({ userId: session.metadata.userId }).populate("items.productId");
    if (!cart) {
        return res.status(404).json({ error: "Cart not found" });
    }

    // Process coupon if one was used
    let couponDetails = null;
    if (session.metadata.couponCode) {
        const couponDoc = await Coupon.findOne({
            code: session.metadata.couponCode,
            user: session.metadata.userId,
        });
        if (couponDoc) {
            // Store coupon details for the order record
            couponDetails = {
                code: couponDoc.code,
                value: couponDoc.value,
                minimumPurchase: couponDoc.minimumPurchase,
            };
            // Delete the coupon after use (one-time use)
            await Coupon.findOneAndDelete({
                code: session.metadata.couponCode,
                user: session.metadata.userId,
            });
        }
    }

    // Award loyalty coins (5% of purchase total)
    const coinsEarned = Math.round((session.amount_total / 100) * 5);
    await User.findByIdAndUpdate(session.metadata.userId, {
        $inc: { coins: coinsEarned }, // Increment user's coins
    });

    // Create a new order record in the database
    const newOrder = new Order({
        userId: session.metadata.userId,
        products: cart.items.map((item) => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.price,
        })),
        totalPrice: session.amount_total / 100, // Convert from cents
        stripeSessionId: session.id,
        coupon: couponDetails,
    });

    await newOrder.save();

    // Clear the user's cart now that purchase is complete
    await Cart.findByIdAndUpdate(cart._id, {
        $set: { items: [], totalPrice: 0 },
    });

    // Return success response with order details
    res.status(200).json({
        orderId: newOrder._id,
        message: "Order completed successfully",
        amount: session.amount_total / 100,
        coinsEarned,
    });
};
