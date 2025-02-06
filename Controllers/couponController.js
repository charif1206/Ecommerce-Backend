const Coupon = require("../Models/Coupon");
const {User} = require("../Models/user");

const generateCouponCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `GIFT-${code}`;
};
exports.getUserCoupons = async (req, res) => {
    const coupons = await Coupon.find({createdBy: req.user._id});
    res.json(coupons);
};

exports.redeemCoupon = async (req, res) => {
    try {
        const {value} = req.body;
        const allowedValues = [5, 10, 20, 50];

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

        const requiredCoins = value * 100;
        const minimumPurchase = minimumPurchaseMap[value];

        // Atomic update to check and subtract coins
        const user = await User.findOneAndUpdate(
            {_id: req.user._id, coins: {$gte: requiredCoins}},
            {$inc: {coins: -requiredCoins}},
            {new: true}
        );

        if (!user) {
            return res.status(400).json({error: "Insufficient coins"});
        }

        // Generate unique coupon code
        let code;
        let isUnique = false;

        while (!isUnique) {
            code = generateCouponCode();
            const exists = await Coupon.exists({code});
            if (!exists) {
                isUnique = true;
            }
        }

        const coupon = await Coupon.create({
            code,
            createdBy: req.user._id,
            value,
            minimumPurchase,
        });

        res.status(201).json(coupon);
    } catch (error) {
        res.status(400).json({error: error.message});
    }
};

exports.validateCoupon = async (req, res) => {
    const {code, cartTotal} = req.body;
    const userId = req.user._id;

    if (!code || !cartTotal) {
        return res.status(400).json({error: "Code and cart total are required"});
    }

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
