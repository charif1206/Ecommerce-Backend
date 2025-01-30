const Cart = require("../Models/Cart");
const Order = require("../Models/order");
const stripe = require("../utils/stripe");
const dotenv = require("dotenv");
dotenv.config();

module.exports.createCheckoutSession = async (req, res) => {
    const cart = await Cart.find({userId: req.user.userId}).populate("items.productId");

    if (!cart || !cart.length) {
        return res.status(404).json({error: "Cart not found"});
    }

    const line_items = cart[0].items.map((item) => {
        const product = item.productId;

        const variant = product.variants.find(
            (v) => v._id.toString() === item.variantId.toString()
        );

        if (!variant) {
            throw new Error(
                `Variant with ID ${item.variantId} not found for product ${product.name}`
            );
        }

        return {
            price_data: {
                currency: "usd",
                product_data: {
                    name: product.name,
                    images: product.productImages?.[0]?.url ? [product.productImages[0].url] : [],
                },
                unit_amount: variant.price * 100, // Access the variant's price
            },
            quantity: item.quantity,
        };
    });

    if (!line_items.length) {
        return res.status(400).json({error: "Invalid or empty line_items array"});
    }

    // Create the Stripe checkout session
    const session = await stripe.checkout.sessions.create({
        line_items,
        mode: "payment",
        success_url: `http://localhost:5173/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://localhost:5173/checkout-cancel`,
        metadata: {
            userId: req.user.userId,
        },
    });

    res.status(200).json({id: session.id, totalAmount: cart[0].totalPrice});
};

module.exports.checkoutSuccess = async (req, res) => {
    const {sessionId} = req.body;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session) {
        const newOrder = new Order({
            userId: req.user.userId,
            items: session.metadata.items,
            totalAmount: session.amount_total,
            sessionId: session.id,
            status: "pending",
        });

        await newOrder.save();
        res.status(200).json({
            id: newOrder._id,
            message: "Payment successful, order created",
        });
    }
};
