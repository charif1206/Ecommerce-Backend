const generateTokenAndSetCookies = require("../middleware/generateTokenAndSetCookies");
const {Cart} = require("../Models/cart");
const {Coupon} = require("../Models/coupon");
const Order = require("../Models/Order");
const {User} = require("../Models/user");
const stripe = require("../utils/stripe");

module.exports.createCheckoutSession = async (req, res) => {
    const {couponCode} = req.body;
    const userId = req.user.userId;

    const cart = await Cart.findOne({userId}).populate("items.productId");
    if (!cart || !cart.items?.length) {
        return res.status(400).json({error: "Cart is empty"});
    }

    // Coupon handling
    let discountValue = 0;
    if (couponCode) {
        const coupon = await Coupon.findOne({code: couponCode, user: userId});
        if (coupon) {
            if (cart.totalPrice < coupon.minimumPurchase) {
                return res.status(400).json({
                    error: `Minimum purchase of $${coupon.minimumPurchase} required`,
                });
            }
            discountValue = coupon.value;
        }
    }

    // Price calculations
    const finalTotal = cart.totalPrice - discountValue;
    const line_items = cart.items.map((item) => {
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
                unit_amount: Math.round(adjustedPrice * 100),
            },
            quantity: item.quantity,
        };
    });

    // Create Stripe session
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

    res.status(200).json({
        id: session.id,
        totalAmount: finalTotal,
        url: session.url,
    });
};

/**
 * Seller Upgrade Checkout ($300 fixed price)
 */
module.exports.createSellerUpgrade = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);

        if (user.roles === "seller") {
            return res.status(400).json({error: "Already a seller"});
        }

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

        res.status(200).json({
            id: session.id,
            url: session.url,
        });
    } catch (error) {
        console.error("Upgrade error:", error);
        res.status(500).json({error: "Upgrade failed"});
    }
};

/**
 * Unified Success Handler
 */
module.exports.checkoutSuccess = async (req, res) => {
    const {sessionId} = req.body;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
        return res.status(400).json({error: "Payment not completed"});
    }

    // Handle Seller Upgrade
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

    // Handle Product Purchase
    const cart = await Cart.findOne({userId: session.metadata.userId}).populate("items.productId");
    if (!cart) {
        return res.status(404).json({error: "Cart not found"});
    }

    // Process coupon
    let couponDetails = null;
    if (session.metadata.couponCode) {
        const couponDoc = await Coupon.findOne({
            code: session.metadata.couponCode,
            user: session.metadata.userId,
        });
        if (couponDoc) {
            couponDetails = {
                code: couponDoc.code,
                value: couponDoc.value,
                minimumPurchase: couponDoc.minimumPurchase,
            };
            await Coupon.findOneAndDelete({
                code: session.metadata.couponCode,
                user: session.metadata.userId,
            });
        }
    }

    const coinsEarned = Math.round((session.amount_total / 100) * 5);
    await User.findByIdAndUpdate(session.metadata.userId, {
        $inc: {coins: coinsEarned},
    });

    // Create order
    const newOrder = new Order({
        userId: session.metadata.userId,
        products: cart.items.map((item) => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.price,
        })),
        totalPrice: session.amount_total / 100,
        stripeSessionId: session.id,
        coupon: couponDetails,
    });

    await newOrder.save();

    // Clear cart
    await Cart.findByIdAndUpdate(cart._id, {
        $set: {items: [], totalPrice: 0},
    });

    res.status(200).json({
        orderId: newOrder._id,
        message: "Order completed successfully",
        amount: session.amount_total / 100,
        coinsEarned,
    });
};
