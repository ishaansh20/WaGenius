const fs = require("fs");
const csv = require("csv-parser");
const mongoose = require("mongoose");

const Contact = require("../models/contact");
const Conversation = require("../models/conversation");
const Segment = require("../models/segment");
const { getIO } = require("../sockets/socket");
const { findOrCreateContact } = require("../services/contactService");
const { buildContactFilter } = require("../services/contact/contactQueryService");

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;
const SORT_FIELDS = new Set(["name", "-name", "createdAt", "-createdAt"]);

const getContacts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const sortParam = SORT_FIELDS.has(req.query.sort) ? req.query.sort : "-createdAt";
    const sortField = sortParam.replace(/^-/, "");
    const sortDirection = sortParam.startsWith("-") ? -1 : 1;

    const filter = { ...buildContactFilter(req.query), companyId: req.companyId };

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip((page - 1) * limit)
        .limit(limit),
      Contact.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      contacts,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to fetch contacts" });
  }
};

const getContact = async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, companyId: req.companyId });

    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    res.status(200).json({ success: true, contact });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to fetch contact" });
  }
};

const createContact = async (req, res) => {
  try {
    const { name, phone, tags } = req.body;

    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    const existing = await Contact.findOne({ phone, companyId: req.companyId });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A contact with this phone number already exists",
        contact: existing,
      });
    }

    const contact = await Contact.create({
      companyId: req.companyId,
      name: name || phone,
      phone,
      tags: tags || [],
      source: "manual",
    });

    res.status(201).json({ success: true, contact });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to create contact" });
  }
};

// Manual name correction — deliberately a separate, explicit action from
// findOrCreateContact's automatic WhatsApp-profile-name sync. No extra
// "protect this from future overwrite" flag is needed here: findOrCreateContact
// already only overwrites `name` when the stored value is still the phone
// placeholder or empty, so any real name set here — manually or otherwise —
// is already safe from being clobbered by a later WhatsApp profile update.
const updateContact = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const contact = await Contact.findOne({ _id: req.params.id, companyId: req.companyId });

    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    contact.name = name.trim();
    await contact.save();

    const updatedConversation = await Conversation.findOne({
      companyId: req.companyId,
      contact: contact._id,
    }).populate("contact");

    if (updatedConversation) {
      getIO().to("inbox").emit("conversation_updated", updatedConversation);
    }

    res.status(200).json({ success: true, contact });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to update contact" });
  }
};

const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, companyId: req.companyId });

    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    const hasConversation = await Conversation.exists({ companyId: req.companyId, contact: contact._id });

    if (hasConversation) {
      return res.status(400).json({
        success: false,
        message: "This contact has message history and can't be deleted — opt them out instead",
      });
    }

    await Contact.deleteOne({ _id: contact._id });

    res.status(200).json({ success: true, message: "Contact deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to delete contact" });
  }
};

const bulkDeleteContacts = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No contacts selected" });
    }

    const contacts = await Contact.find({ _id: { $in: ids }, companyId: req.companyId });
    const conversations = await Conversation.find({
      companyId: req.companyId,
      contact: { $in: ids },
    }).select("contact");
    const contactsWithHistory = new Set(conversations.map((c) => String(c.contact)));

    const deletable = contacts.filter((c) => !contactsWithHistory.has(String(c._id)));
    const skipped = contacts
      .filter((c) => contactsWithHistory.has(String(c._id)))
      .map((c) => ({ id: c._id, reason: "has_conversation" }));

    if (deletable.length > 0) {
      await Contact.deleteMany({ _id: { $in: deletable.map((c) => c._id) }, companyId: req.companyId });
    }

    res.status(200).json({
      success: true,
      deletedCount: deletable.length,
      skipped,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to delete contacts" });
  }
};

const bulkUpdateTags = async (req, res) => {
  try {
    const { ids, tags, action } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No contacts selected" });
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ success: false, message: "No tags provided" });
    }

    if (action === "add") {
      await Contact.updateMany(
        { _id: { $in: ids }, companyId: req.companyId },
        { $addToSet: { tags: { $each: tags } } },
      );
    } else if (action === "remove") {
      await Contact.updateMany(
        { _id: { $in: ids }, companyId: req.companyId },
        { $pull: { tags: { $in: tags } } },
      );
    } else {
      return res.status(400).json({ success: false, message: "action must be 'add' or 'remove'" });
    }

    const affectedConversations = await Conversation.find({
      companyId: req.companyId,
      contact: { $in: ids },
    }).populate("contact");
    const io = getIO();

    affectedConversations.forEach((conversation) => {
      io.to("inbox").emit("conversation_updated", conversation);
    });

    res.status(200).json({ success: true, updatedCount: ids.length });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to update tags" });
  }
};

const importContacts = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "CSV file is required" });
    }

    const rows = [];
    const stream = fs.createReadStream(req.file.path);

    stream
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", async () => {
        try {
          const summary = { totalRows: rows.length, created: 0, updated: 0, skipped: 0, invalid: 0 };
          const invalidRows = [];
          const importedContactIds = [];
          const { segmentId } = req.body;
          const { companyId } = req;

          for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i];
            const phone = row.phone?.trim();

            if (!phone) {
              summary.invalid += 1;
              invalidRows.push({ row: i + 1, reason: "missing phone" });
              continue;
            }

            const tags = row.tags
              ? row.tags.split(",").map((t) => t.trim()).filter(Boolean)
              : [];

            const { contact, created, updated } = await findOrCreateContact({
              companyId,
              phone,
              name: row.name?.trim(),
              tags,
              source: "imported",
            });

            importedContactIds.push(contact._id);

            if (created) summary.created += 1;
            else if (updated) summary.updated += 1;
            else summary.skipped += 1;
          }

          // A group's membership only changes through its own explicit
          // add/import actions (see segmentController.js) — this is that
          // action for the "Import Contacts" path, folding every row from
          // this CSV (new or already-existing contacts) into the target
          // group in one update.
          if (segmentId && importedContactIds.length > 0) {
            await Segment.updateOne(
              { _id: segmentId, companyId, type: "static" },
              { $addToSet: { contactIds: { $each: importedContactIds } } },
            );
          }

          res.status(200).json({ success: true, summary, invalidRows });
        } catch (error) {
          console.log(error);
          res.status(500).json({ success: false, message: "Failed to process contact import" });
        }
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to import contacts" });
  }
};

const getSegmentationStats = async (req, res) => {
  try {
    const { companyId } = req;
    // Aggregate pipelines skip Mongoose's automatic string->ObjectId casting
    // (unlike find()/countDocuments()), so $match needs a real ObjectId or
    // it silently matches nothing.
    const companyObjectId = new mongoose.Types.ObjectId(companyId);
    const [byTag, bySource, optedOutCount, totalCount] = await Promise.all([
      Contact.aggregate([
        { $match: { companyId: companyObjectId } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $project: { _id: 0, tag: "$_id", count: 1 } },
        { $sort: { count: -1 } },
      ]),
      Contact.aggregate([
        { $match: { companyId: companyObjectId } },
        // $group bypasses Mongoose's schema-level default entirely — a raw
        // aggregation sees exactly what's stored, so contacts created before
        // the `source` field existed have no field at all, not "whatsapp".
        // $ifNull applies that same default at query time so old contacts
        // aren't miscounted as a phantom "unknown" source.
        { $group: { _id: { $ifNull: ["$source", "whatsapp"] }, count: { $sum: 1 } } },
        { $project: { _id: 0, source: "$_id", count: 1 } },
        { $sort: { count: -1 } },
      ]),
      Contact.countDocuments({ companyId, optedOut: true }),
      Contact.countDocuments({ companyId }),
    ]);

    res.status(200).json({
      success: true,
      byTag,
      bySource,
      optedIn: totalCount - optedOutCount,
      optedOut: optedOutCount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to fetch segmentation stats" });
  }
};

const escapeCsvCell = (value) => {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const exportContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({ companyId: req.companyId })
      .sort({ createdAt: -1 })
      .lean();

    const rows = [
      "Name,Phone,Tags,Source,Opted Out,Created At",
      ...contacts.map((c) =>
        [
          c.name,
          c.phone,
          (c.tags || []).join("|"),
          c.source || "whatsapp",
          c.optedOut ? "Yes" : "No",
          new Date(c.createdAt).toISOString(),
        ]
          .map(escapeCsvCell)
          .join(","),
      ),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="contacts-export.csv"`);
    res.send(rows.join("\n"));
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to export contacts" });
  }
};

module.exports = {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  bulkDeleteContacts,
  bulkUpdateTags,
  importContacts,
  exportContacts,
  getSegmentationStats,
};
