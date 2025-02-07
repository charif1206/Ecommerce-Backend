const mongoose = require("mongoose");
const Order = require("../Models/Order");
const {Product} = require("../Models/Product");
const {User} = require("../Models/user");

const getAnalyticsData = async (userId, roles) => {
    const userIdObject = new mongoose.Types.ObjectId(userId);
    let totalUsers = 0;

    // Count total products that belong to the current seller
    const totalProducts = await Product.find({seller: userId}).countDocuments();

    if (roles === "admin") {
        totalUsers = await User.find().countDocuments();
    }

    const salesDataFinal = await Order.aggregate([
        // Unwind products to get each product in the order separately
        {$unwind: "$products"},

        // Lookup the product details using the productId
        {
            $lookup: {
                from: "products",
                localField: "products.productId",
                foreignField: "_id",
                as: "productDetails",
            },
        },

        // Unwind productDetails to access individual product data
        {$unwind: "$productDetails"},

        // Match only the products that belong to the current seller
        {$match: {"productDetails.seller": userIdObject}},

        // Group by seller and calculate total sales and total revenue
        {
            $group: {
                _id: null,
                totalSales: {$sum: "$products.quantity"}, // Count total quantity sold
                totalRevenue: {$sum: "$totalPrice"}, // Sum total price (already includes product quantity)
            },
        },
    ]);

    console.log("Final Result:", JSON.stringify(salesDataFinal, null, 2));

    // Fallback to zeros if no matching sales data is found
    const {totalSales, totalRevenue} = salesDataFinal[0] || {totalSales: 0, totalRevenue: 0};

    return {
        users: totalUsers,
        products: totalProducts,
        totalSales,
        totalRevenue,
    };
};

const getDailySalesData = async (startDate, endDate, userId) => {
    const sellerObjectId = new mongoose.Types.ObjectId(userId);

    try {
        const dailySalesData = await Order.aggregate([
            {
                $lookup: {
                    from: "products", // The name of your Product collection
                    localField: "products.productId", // Field in Order collection that references Product
                    foreignField: "_id", // Field in Product collection that is referenced
                    as: "product", // Alias for the matched documents from Product
                },
            },
            {
                $unwind: {
                    path: "$product", // Unwind to flatten the matched product data
                    preserveNullAndEmptyArrays: true, // Ensure we don't lose orders with no products
                },
            },
            {
                $match: {
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                    "product.seller": sellerObjectId, // Ensure sellerId is ObjectId
                },
            },
            {
                $group: {
                    _id: {$dateToString: {format: "%Y-%m-%d", date: "$createdAt"}}, // Group by date
                    sales: {$sum: 1}, // Count sales (orders)
                    revenue: {$sum: "$totalPrice"}, // Sum revenue (totalAmount)
                },
            },
            {$sort: {_id: 1}}, // Sort by date
        ]);

        console.log("Seller ObjectId:", sellerObjectId);
        console.log("Daily Sales Data:", JSON.stringify(dailySalesData, null, 2));

        // example of dailySalesData
        // [
        // 	{
        // 		_id: "2024-08-18",
        // 		sales: 12,
        // 		revenue: 1450.75
        // 	},
        // ]

        const dateArray = getDatesInRange(startDate, endDate);
        // console.log(dateArray) // ['2024-08-18', '2024-08-19', ... ]

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
