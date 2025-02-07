const express = require("express");
const login = require("../middleware/auth/login");
const {getAnalyticsData, getDailySalesData} = require("../Controllers/analyticsController");
const checkRole = require("../middleware/auth/mainRoleCheker");

const analyticsRouter = express.Router();

analyticsRouter.get("/", [login,checkRole("seller")], async (req, res) => {
    const {userId, roles} = req.user;

    const analyticsData = await getAnalyticsData(userId, roles);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dailySalesData = await getDailySalesData(startDate, endDate, userId);

    res.json({
        analyticsData,
        dailySalesData,
    });
});

module.exports = analyticsRouter;
