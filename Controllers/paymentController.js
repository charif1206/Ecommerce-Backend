const Cart = require("../Models/Cart");
const Coupon = require("../Models/Coupon");
const Order = require("../Models/Order");
const {User} = require("../Models/user");
const stripe = require("../utils/stripe");
const dotenv = require("dotenv");
dotenv.config();

module.exports.createCheckoutSession = async (req, res) => {
    const {couponCode} = req.body;
    const userId = req.user.userId;

    // Get user's cart and populate product details
    const cart = await Cart.findOne({userId: req.user.userId}).populate("items.productId");

    if (!cart) {
        return res.status(404).json({error: "Cart not found"});
    }
    if (!cart.items || cart.items.length === 0) {
        return res.status(400).json({error: "Cart is empty"});
    }

    // Calculate original cart total (assumed already computed in cart.totalPrice)
    const originalTotal = cart.totalPrice;
    let discountValue = 0;
    let coupon = null;
    if (couponCode) {
        // Look up the coupon using the "user" field
        coupon = await Coupon.findOne({code: couponCode, user: userId});
        if (coupon) {
            discountValue = coupon.value;
        }
    }

    // Final total after discount
    const finalTotal = originalTotal - discountValue;

    // Recalculate line items proportionally so that the sum equals finalTotal
    // For each item, compute its original total and then its proportional discount share.
    const line_items = cart.items.map((item) => {
        const itemOriginalTotal = item.price * item.quantity; // total price for this item
        const itemDiscount = (itemOriginalTotal / originalTotal) * discountValue;
        const newItemTotal = itemOriginalTotal - itemDiscount;
        const newUnitPrice = newItemTotal / item.quantity; // adjusted unit price
        return {
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.productId.name,
                    images:
                        item.productId.productImages && item.productId.productImages.length > 0
                            ? item.productId.productImages.map((img) => img.url)
                            : [],
                },
                unit_amount: Math.round(newUnitPrice * 100), // convert dollars to cents
            },
            quantity: item.quantity,
        };
    });

    // Create Stripe checkout session using the adjusted line items
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items,
        mode: "payment",
        success_url: `http://localhost:5173/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://localhost:5173/cart`,
        metadata: {
            userId: req.user.userId.toString(),
            couponCode: couponCode || null,
            cartId: cart._id.toString(),
        },
    });

    res.status(200).json({
        id: session.id,
        totalAmount: finalTotal,
        url: session.url,
    });
};

module.exports.checkoutSuccess = async (req, res) => {
    const {sessionId} = req.body;

    // Retrieve Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Only process if payment is completed
    if (session.payment_status !== "paid") {
        return res.status(400).json({error: "Payment not completed"});
    }

    // Find user's cart and populate product details
    const cart = await Cart.findOne({userId: session.metadata.userId}).populate("items.productId");
    if (!cart) {
        return res.status(404).json({error: "Cart not found"});
    }

    // Prepare coupon details if a coupon was used
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
            // Remove the coupon so it cannot be reused
            await Coupon.findOneAndDelete({
                code: session.metadata.couponCode,
                user: session.metadata.userId,
            });
        }
    }

    // Calculate coins earned (example: 2.5 coins per dollar paid)
    const coinsEarned = Math.round((session.amount_total / 100) * 2.5);

    // Update user's coins
    await User.findByIdAndUpdate(session.metadata.userId, {
        $inc: {coins: coinsEarned},
    });

    // Create an order using the cart items and include coupon details if applicable
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

    // Clear the cart after order creation
    await Cart.findByIdAndUpdate(cart._id, {
        $set: {items: [], totalPrice: 0},
    });

    res.status(200).json({
        orderId: newOrder._id,
        message: "Payment successful, order created",
        amount: session.amount_total / 100,
        coinsEarned,
    });
};
