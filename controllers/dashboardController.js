import Leads from "../models/Leads.modal.js";
import User from "../models/User.modal.js";
import LeadStatus from "../models/LeadStatus.modal.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { apiResponse } from "../utils/apiResponse.js";


// Get complete dashboard analytics
export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;

  // 1. Total Leads
  const totalLeads = await Leads.countDocuments();

  // 2. Total Telecallers
  const totalTelecallers = await User.countDocuments({ role: "Telecaller" });

  // 3. Status-wise counts (unique statuses only)
  const statusCounts = await Leads.aggregate([
    {
      $group: {
        _id: "$currentStatus",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  // 4. Monthly trend with status breakdown
  const monthlyTrend = await Leads.aggregate([
    {
      $match: {
        leadDate: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$leadDate" },
          status: "$currentStatus",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.month",
        statuses: {
          $push: {
            status: "$_id.status",
            count: "$count",
          },
        },
        totalLeads: { $sum: "$count" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // Format monthly data
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const formattedMonthlyTrend = monthNames.map((month, index) => {
    const monthData = monthlyTrend.find(
      (item) => item._id === index + 1
    );

    return {
      month,
      totalLeads: monthData?.totalLeads || 0,
      statuses: monthData?.statuses || [],
    };
  });

  // Prepare final response
  const dashboardData = {
    overview: {
      totalLeads,
      totalTelecallers,
    },
    statusCounts: statusCounts.map((item) => ({
      status: item._id,
      count: item.count,
    })),
    monthlyTrend: formattedMonthlyTrend,
  };

  return res.status(200).json(
    new apiResponse(
      200,
      dashboardData,
      "Dashboard analytics fetched successfully"
    )
  );
});

// Get yearly analytics
export const getYearlyAnalytics = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;

  const yearlyData = await Leads.aggregate([
    {
      $match: {
        leadDate: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$leadDate" },
          status: "$currentStatus",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.month",
        statuses: {
          $push: {
            status: "$_id.status",
            count: "$count",
          },
        },
        totalLeads: { $sum: "$count" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const formattedData = yearlyData.map((item) => {
    const statusArray = item.statuses.map((s) => ({
      status: s.status,
      count: s.count,
    }));

    return {
      month: monthNames[item._id - 1] || `Month ${item._id}`,
      totalLeads: item.totalLeads,
      statuses: statusArray,
    };
  });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        year: parseInt(year),
        data: formattedData,
        totalLeads: formattedData.reduce((sum, item) => sum + item.totalLeads, 0),
      },
      `Yearly analytics for ${year} fetched successfully`
    )
  );
});

// Get status-wise leads only
export const getStatusWiseLeads = asyncHandler(async (req, res) => {
  const statusCounts = await Leads.aggregate([
    {
      $group: {
        _id: "$currentStatus",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  return res.status(200).json(
    new apiResponse(
      200,
      statusCounts.map((item) => ({
        status: item._id,
        count: item.count,
      })),
      "Status-wise leads fetched successfully"
    )
  );
});

// Get monthly trend only
export const getMonthlyTrend = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;

  const monthlyData = await Leads.aggregate([
    {
      $match: {
        leadDate: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$leadDate" },
          status: "$currentStatus",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.month",
        statuses: {
          $push: {
            status: "$_id.status",
            count: "$count",
          },
        },
        totalLeads: { $sum: "$count" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const formattedData = monthlyData.map((item) => {
    const statusArray = item.statuses.map((s) => ({
      status: s.status,
      count: s.count,
    }));

    return {
      month: monthNames[item._id - 1] || `Month ${item._id}`,
      totalLeads: item.totalLeads,
      statuses: statusArray,
    };
  });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        year: parseInt(year),
        data: formattedData,
      },
      "Monthly trend fetched successfully"
    )
  );
});