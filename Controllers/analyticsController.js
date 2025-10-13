const mongoose = require("mongoose");
const Order = require("../Models/Order");
const { Product } = require("../Models/Product");
const { User } = require("../Models/user");

/**
 * Retrieves analytics data for a given user.
 * Excludes products where isDeleted = true.
 */
const getAnalyticsData = async (userId, roles) => {
    // Convert userId to ObjectId for MongoDB queries
    const userIdObject = new mongoose.Types.ObjectId(userId);

    let totalUsers = 0;

    // Count total products that belong to the current seller (excluding deleted).
    const totalProducts = await Product.find({
        seller: userId,
        isDeleted: { $ne: true },
    }).countDocuments();

    // If admin, count all users
    if (roles === "admin") {
        totalUsers = await User.find().countDocuments();
    }

    // Aggregation to get totalSales and totalRevenue
    const salesDataFinal = await Order.aggregate([
        // Unwind products to get each product in the order separately
        { $unwind: "$products" },

        // Match orders that contain products from the current seller
        {
            $lookup: {
                from: "products",
                localField: "products.productId",
                foreignField: "_id",
                as: "productDetails",
            },
        },

        // Unwind productDetails to access individual product data
        { $unwind: "$productDetails" },

        // Match only products that belong to the current seller and are not soft-deleted
        {
            $match: {
                "productDetails.seller": userIdObject,
                "productDetails.isDeleted": { $ne: true },
            },
        },

        // Group by seller and calculate total sales and total revenue
        {
            $group: {
                _id: null,
                totalSales: { $sum: "$products.quantity" }, // Count total quantity sold
                totalRevenue: { $sum: "$totalPrice" }, // Sum total price
            },
        },
    ]);

    // Fallback to zeros if no matching sales data is found
    const { totalSales, totalRevenue } = salesDataFinal[0] || {
        totalSales: 0,
        totalRevenue: 0,
    };

    return {
        users: totalUsers,
        products: totalProducts,
        totalSales,
        totalRevenue,
    };
};

/**
 * Retrieves daily sales data (orders) for a given user within a date range.
 * Excludes products where isDeleted = true.
 */
const getDailySalesData = async (startDate, endDate, userId) => {
    const sellerObjectId = new mongoose.Types.ObjectId(userId);

    try {
        const dailySalesData = await Order.aggregate([
            {
                $lookup: {
                    from: "products",
                    localField: "products.productId",
                    foreignField: "_id",
                    as: "product",
                },
            },
            {
                $unwind: {
                    path: "$product",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $match: {
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    "product.seller": sellerObjectId,
                    "product.isDeleted": { $ne: true }, // Exclude soft-deleted products
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    sales: { $sum: 1 }, // Count 1 sale per order
                    revenue: { $sum: "$totalPrice" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const dateArray = getDatesInRange(startDate, endDate);

        // Return an array of daily data, ensuring we fill days with zero data
        return dateArray.map((date) => {
            const foundData = dailySalesData.find((item) => item._id === date);

            return {
                date,
                sales: foundData?.sales || 0,
                revenue: foundData?.revenue || 0,
            };
        });
    } catch (error) {
        throw error;
    }
};

function getDatesInRange(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split("T")[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
}

exports.getAnalyticsData = getAnalyticsData;
exports.getDailySalesData = getDailySalesData;
