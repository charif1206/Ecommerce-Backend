const Cart = require("../Models/Cart");
const Coupon = require("../Models/Coupon");
const Order = require("../Models/Order");
const {User} = require("../Models/user");
const stripe = require("../utils/stripe");
const dotenv = require("dotenv");
dotenv.config();

module.exports.createCheckoutSession = async (req, res) => {
    const {couponCode} = req.body;
    const userId = req.user._id;
    // Get user's cart
    const cart = await Cart.findOne({userId: req.user.userId}).populate("items.productId");

    if (!cart) {
        return res.status(404).json({error: "Cart not found"});
    }

    // Validate cart items
    if (!cart.items || cart.items.length === 0) {
        return res.status(400).json({error: "Cart is empty"});
    }

    // Create line items for Stripe
    const line_items = cart.items.map((item) => {
        const product = item.productId;

        return {
            price_data: {
                currency: "usd",
                product_data: {
                    name: product.name,
                    images: product.productImages?.[0]?.url ? [product.productImages[0].url] : [],
                },
                unit_amount: Math.round(item.price * 100), // Use item price from cart
            },
            quantity: item.quantity,
        };
    });

    let coupon = null;
    if (couponCode) {
        coupon = await Coupon.findOne({code: couponCode, user: userId});
        if (coupon) {
            cart.totalPrice -= coupon.value;
        }
    }

    // Create Stripe session
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
        totalAmount: cart.totalPrice,
        url: session.url,
    });
};

module.exports.checkoutSuccess = async (req, res) => {
    const {sessionId} = req.body;

    // Retrieve Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Only process paid sessions
    if (session.payment_status !== "paid") {
        return res.status(400).json({error: "Payment not completed"});
    }

    // Find user's cart
    const cart = await Cart.findOne({
        userId: session.metadata.userId,
    }).populate("items.productId");

    if (!cart) {
        return res.status(404).json({error: "Cart not found"});
    }

    // Remove used coupon (if any)
    if (session.metadata.couponCode) {
        await Coupon.findOneAndDelete({
            code: session.metadata.couponCode,
            createdBy: session.metadata.userId, // Changed from 'user' to 'createdBy'
        });
    }

    // Calculate coins based on ACTUAL amount paid (5% reward)
    const coinsEarned = Math.round((session.amount_total / 100) * 2.5);

    // Update user's coins using session metadata ID
    await User.findByIdAndUpdate(session.metadata.userId, {
        $inc: {coins: coinsEarned},
    });

    // Create order with actual payment amount
    const newOrder = new Order({
        userId: session.metadata.userId,
        products: cart.items.map((item) => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.price,
        })),
        totalPrice: session.amount_total / 100, // Use actual paid amount
        stripeSessionId: session.id,
    });

    await newOrder.save();

    // Clear the cart
    await Cart.findByIdAndUpdate(cart._id, {
        $set: {items: [], totalPrice: 0},
    });

    res.status(200).json({
        orderId: newOrder._id,
        message: "Payment successful, order created",
        amount: session.amount_total / 100,
        coinsEarned, // Include coins in response
    });
};
