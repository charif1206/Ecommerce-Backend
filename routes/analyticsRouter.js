const express = require("express");
const login = require("../middleware/auth/login");
const {getAnalyticsData, getDailySalesData} = require("../Controllers/analyticsController");
const {User} = require("../Models/user");

const analyticsRouter = express.Router();

analyticsRouter.get("/", login, async (req, res) => {
    const userId = "6716a9097e3743431a89ac60";

    const analyticsData = await getAnalyticsData(userId);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dailySalesData = await getDailySalesData(startDate, endDate, userId);

    res.json({
        analyticsData,
        dailySalesData,
    });
});

module.exports = analyticsRouter;
