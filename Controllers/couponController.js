const Coupon = require("../Models/Coupon");
const {User} = require("../Models/user");

// Helper to generate a unique coupon code
const generateCouponCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `GIFT-${code}`;
};

exports.getUserCoupons = async (req, res) => {
    // Retrieve coupons associated with the current user using req.user.userId
    const coupons = await Coupon.find({user: req.user.userId});
    res.json(coupons);
};

exports.redeemCoupon = async (req, res) => {
    const {value} = req.body;
    const allowedValues = [5, 10, 20, 50];
    console.log(value);
    

    if (!allowedValues.includes(value)) {
        return res.status(400).json({error: "Invalid coupon value"});
    }

    // Define minimum purchase requirements
    const minimumPurchaseMap = {
        5: 25, // $5 coupon requires $25 minimum purchase
        10: 50, // $10 coupon requires $50 minimum purchase
        20: 100, // $20 coupon requires $100 minimum purchase
        50: 250, // $50 coupon requires $250 minimum purchase
    };

    const requiredCoins = value * 100; // e.g., a $50 coupon requires 5000 coins
    const minimumPurchase = minimumPurchaseMap[value];

    // Atomically check if the user has enough coins and subtract them
    const user = await User.findOneAndUpdate(
        {_id: req.user.userId, coins: {$gte: requiredCoins}},
        {$inc: {coins: -requiredCoins}},
        {new: true}
    );

    if (!user) {
        return res.status(400).json({error: "Insufficient coins"});
    }

    // Generate a unique coupon code
    let code;
    let isUnique = false;
    while (!isUnique) {
        code = generateCouponCode();
        const exists = await Coupon.exists({code});
        if (!exists) {
            isUnique = true;
        }
    }

    // Create the coupon using the "user" field (from req.user.userId)
    const coupon = await Coupon.create({
        code,
        user: req.user.userId,
        value,
        minimumPurchase,
    });

    res.status(201).json(coupon);
};

exports.validateCoupon = async (req, res) => {
    const {code, cartTotal} = req.body;
    const userId = req.user.userId;

    if (!code || !cartTotal) {
        return res.status(400).json({error: "Code and cart total are required"});
    }

    // Look up the coupon by code and user
    const coupon = await Coupon.findOne({code, user: userId});
    if (!coupon) {
        return res.status(404).json({error: "Coupon not found"});
    }

    if (cartTotal < coupon.minimumPurchase) {
        return res.status(400).json({
            error: `Minimum purchase of $${coupon.minimumPurchase} required for this coupon`,
        });
    }

    res.json({
        valid: true,
        value: coupon.value,
        message: "Coupon applied successfully",
    });
};
