const Order = require("../Models/Order");

exports.getCurrentOrder = async (req, res) => {
    const {sessionId} = req.params;

    console.log(sessionId);
    
    const order = await Order.findOne({stripeSessionId : sessionId}).populate("products.productId");

    if (!order) return res.status(404).json({error: "Order not found"});

    res.status(200).json(order);
};
