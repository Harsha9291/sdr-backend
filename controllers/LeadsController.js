import Leads from "../models/Leads.modal.js";
import LeadHistory from "../models/LeadHistory.model.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

const addLead = asyncHandler(async (req, res) => {
  try {
    const { phone, name, gender, email, platfrom, remark, leadDate } = req.body;

    if (!phone) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Phone number is required"));
    }

    const existingLead = await Leads.findOne({ phone });
    if (existingLead) {
      return res
        .status(400)
        .json(
          new apiResponse(400, null, "Lead with this phone already exists")
        );
    }

    const newLead = await Leads.create({
      phone,
      name,
      gender,
      email,
      platfrom,
      remark,
      leadDate: leadDate || new Date(),
    });

    res
      .status(201)
      .json(new apiResponse(201, newLead, "Lead created successfully"));
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(500, null, `Error creating lead: ${error.message}`)
      );
  }
});

const bulkAddLeads = asyncHandler(async (req, res) => {
  const leads = req.body.leads;

  if (!Array.isArray(leads) || leads.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid or empty leads data array"));
  }

  try {
    // 🔹 Remove duplicates inside the uploaded list by phone number
    const uniqueLeads = leads.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.phone?.trim().toLowerCase() === item.phone?.trim().toLowerCase()
        )
    );

    // 🔹 Check existing leads in DB (by phone)
    const existingPhones = await Leads.find({
      phone: { $in: uniqueLeads.map((l) => l.phone) },
    }).distinct("phone");

    // 🔹 Filter out already existing leads
    const newLeads = uniqueLeads.filter(
      (l) => !existingPhones.includes(l.phone)
    );

    if (newLeads.length === 0) {
      return res
        .status(200)
        .json(new apiResponse(200, [], "All provided leads already exist"));
    }

    // 🔹 Add default values if missing
    const formattedLeads = newLeads.map((lead) => ({
      phone: lead.phone?.trim(),
      name: lead.name || "",
      gender: lead.gender || "",
      email: lead.email?.toLowerCase() || "",
      platfrom: lead.platfrom || "",
      remark: lead.remark || "",
      leadDate: lead.leadDate ? new Date(lead.leadDate) : new Date(),
      assignTo: lead.assignTo || null,
    }));

    // 🔹 Insert in batches for performance
    const BATCH_SIZE = 1000;
    let insertedCount = 0;
    for (let i = 0; i < formattedLeads.length; i += BATCH_SIZE) {
      const batch = formattedLeads.slice(i, i + BATCH_SIZE);
      const inserted = await Leads.insertMany(batch, { ordered: false });
      insertedCount += inserted.length;
    }

    res.status(201).json(
      new apiResponse(
        201,
        {
          totalReceived: leads.length,
          totalUnique: uniqueLeads.length,
          insertedCount,
          skippedDuplicates: existingPhones.length,
        },
        `${insertedCount} new leads inserted successfully`
      )
    );
  } catch (error) {
    console.error("Bulk insert error:", error);
    res
      .status(500)
      .json(new apiResponse(500, null, `Bulk insert error: ${error.message}`));
  }
});

const updateLead = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Leads.findById(id);

    if (!lead) {
      return res.status(404).json(new apiResponse(404, null, "Lead not found"));
    }

    // Keep track of previous status
    const previousStatus = lead.status;

    // Update lead fields
    Object.keys(req.body).forEach((key) => {
      lead[key] = req.body[key];
    });

    await lead.save();

    // Create LeadHistory log
    const historyData = {
      leadId: lead._id,
      employeeId: lead.assignTo || null,
      actionType: req.body.actionType || "STATUS_CHANGED",
      previousStatus: previousStatus,
      status: lead.status || previousStatus,
      comment: req.body.comment || null, // optional comment
      performedBy: req.user?._id || null, // user performing the update
      performedAt: new Date(),
    };

    await LeadHistory.create(historyData);

    res
      .status(200)
      .json(new apiResponse(200, lead, "Lead updated successfully and logged"));
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(500, null, `Error updating lead: ${error.message}`)
      );
  }
});

const deleteLead = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Leads.findById(id);

    if (!lead) {
      return res.status(404).json(new apiResponse(404, null, "Lead not found"));
    }

    await Leads.findByIdAndDelete(id);

    res
      .status(200)
      .json(new apiResponse(200, null, "Lead deleted successfully"));
  } catch (error) {
    res
      .status(500)
      .json(
        new apiResponse(500, null, `Error deleting lead: ${error.message}`)
      );
  }
});

const getAllLeads = asyncHandler(async (req, res) => {
  const {
    isPagination = "true",
    page = 1,
    limit = 10,
    search,
    sortBy = "recent",
    fromDate,
    toDate,
    assignTo,
    platfrom, // new query param for filtering by platform
  } = req.query;

  let pipeline = [];

  // 🔍 Search filter
  if (search) {
    const regex = new RegExp(search, "i");
    pipeline.push({
      $match: {
        $or: [
          { name: regex },
          { phone: regex },
          { email: regex },
          { platfrom: regex },
          { remark: regex },
        ],
      },
    });
  }

  // 📅 Date filter by leadDate
  if (fromDate || toDate) {
    const dateFilter = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);
    pipeline.push({ $match: { leadDate: dateFilter } });
  }

  // 👤 Filter by assignTo userId
  if (assignTo && mongoose.Types.ObjectId.isValid(assignTo)) {
    pipeline.push({
      $match: { assignTo: new mongoose.Types.ObjectId(assignTo) },
    });
  }

  // 🌐 Filter by platform
  if (platfrom) {
    const platformRegex = new RegExp(platfrom, "i");
    pipeline.push({ $match: { platfrom: platformRegex } });
  }

  // 📅 Sorting
  if (sortBy === "recent") pipeline.push({ $sort: { createdAt: -1 } });
  else if (sortBy === "oldest") pipeline.push({ $sort: { createdAt: 1 } });

  // 👤 Populate assignTo (selected fields only)
  pipeline.push({
    $lookup: {
      from: "users",
      let: { userId: "$assignTo" },
      pipeline: [
        { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            phone: 1,
            gender: 1,
            roll: 1,
            occupation: 1,
            address: 1,
            profilepic: 1,
          },
        },
      ],
      as: "assignTo",
    },
  });

  pipeline.push({
    $unwind: { path: "$assignTo", preserveNullAndEmptyArrays: true },
  });

  // 🎯 Select specific fields to show
  pipeline.push({
    $project: {
      name: 1,
      phone: 1,
      email: 1,
      platfrom: 1,
      remark: 1,
      leadDate: 1,
      createdAt: 1,
      "assignTo._id": 1,
      "assignTo.name": 1,
      "assignTo.email": 1,
      "assignTo.phone": 1,
      "assignTo.gender": 1,
      "assignTo.roll": 1,
      "assignTo.occupation": 1,
      "assignTo.profilepic": 1,
    },
  });

  // 📊 Total count before pagination
  const totalData = await Leads.aggregate([...pipeline, { $count: "count" }]);
  const total = totalData[0]?.count || 0;

  // ⏩ Pagination
  if (isPagination === "true") {
    pipeline.push({ $skip: (page - 1) * limit }, { $limit: parseInt(limit) });
  }

  const leads = await Leads.aggregate(pipeline);

  res.status(200).json(
    new apiResponse(
      200,
      {
        leads,
        totalLeads: total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
      "Leads fetched successfully"
    )
  );
});

const getLeadById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lead = await Leads.findById(id).populate(
    "assignTo",
    "name email phone gender roll occupation profilepic"
  );

  if (!lead)
    return res.status(404).json(new apiResponse(404, null, "Lead not found"));

  res.status(200).json(new apiResponse(200, lead, "Lead fetched successfully"));
});

const assignLeads = asyncHandler(async (req, res) => {
  const { type, employeeId, employeeIds, leadIds } = req.body;

  if (!type || !["manual", "auto"].includes(type)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid assignment type"));
  }

  // ---------- MANUAL ----------
  if (type === "manual") {
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Valid employeeId is required"));
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            "Lead IDs are required for manual assignment"
          )
        );
    }

    const updatedLeads = await Leads.updateMany(
      { _id: { $in: leadIds.map((id) => new mongoose.Types.ObjectId(id)) } },
      { $set: { assignTo: new mongoose.Types.ObjectId(employeeId) } },
      { multi: true }
    );

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          updatedLeads,
          `Leads assigned manually to employee ${employeeId} successfully`
        )
      );
  }

  // ---------- AUTO ----------
  if (type === "auto") {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            "Employee IDs are required for auto assignment"
          )
        );
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res
        .status(400)
        .json(
          new apiResponse(
            400,
            null,
            "Lead IDs are required for auto assignment"
          )
        );
    }

    // Round-robin assignment
    const updates = leadIds.map((leadId, index) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(leadId) },
        update: {
          assignTo: new mongoose.Types.ObjectId(
            employeeIds[index % employeeIds.length]
          ),
        },
      },
    }));

    const result = await Leads.bulkWrite(updates);

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          result,
          `Leads assigned automatically (round-robin) to selected employees successfully`
        )
      );
  }
});

export {
  addLead,
  updateLead,
  deleteLead,
  getAllLeads,
  getLeadById,
  bulkAddLeads,
  assignLeads,
};
