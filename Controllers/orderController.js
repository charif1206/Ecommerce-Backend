const Order = require("../Models/Order");

// Get the current order by session ID (shows all product details regardless of soft deletion)
exports.getCurrentOrder = async (req, res) => {
    const {sessionId} = req.params;
    const order = await Order.findOne({stripeSessionId: sessionId}).populate("products.productId");

    if (!order) return res.status(404).json({error: "Order not found"});

    res.status(200).json(order);
};

// Get all orders for the currently logged-in customer (shows all product details)
exports.getCustomerOrders = async (req, res) => {
    const orders = await Order.find({userId: req.user.userId})
        .sort({createdAt: -1})
        .populate("products.productId");
    console.log(orders);

    res.json({orders});
};

// Get all orders that include products sold by the currently logged-in seller (shows all product details)
exports.getSellerOrders = async (req, res) => {
    let orders = await Order.find().populate("products.productId").sort({createdAt: -1});

    orders = orders.filter((order) =>
        order.products.some(
            (item) =>
                item.productId &&
                item.productId.seller &&
                item.productId.seller.toString() === req.user.userId
        )
    );

    res.json({orders});
};

// Controller to update the status of an order
exports.updateOrderStatus = async (req, res) => {
    const {id: orderId} = req.params;
    const {status} = req.body;

    const order = await Order.findById(orderId)
        .populate("products.productId")
        .sort({createdAt: -1});
    if (!order) {
        return res.status(404).json({message: "Order not found"});
    }

    if (req.user.roles === "seller") {
        const isSellerOrder = order.products.some(
            (item) => item.productId && item.productId.seller.toString() === req.user.userId
        );
        if (!isSellerOrder) {
            return res.status(403).json({message: "You are not authorized to update this order"});
        }
    }

    order.status = status;
    await order.save();

    return res.status(200).json({order});
};
