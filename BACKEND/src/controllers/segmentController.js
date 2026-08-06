const Segment = require("../models/segment");
const Contact = require("../models/contact");
const { buildContactFilter } = require("../services/contact/contactQueryService");

const SAFETY_CAP = 20000;

const createSegment = async (req, res) => {
  try {
    const { name, filter, type } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Segment name is required" });
    }

    const segmentType = type === "static" ? "static" : "filter";

    const segment = await Segment.create({
      companyId: req.companyId,
      name: name.trim(),
      type: segmentType,
      filter: segmentType === "filter" ? filter || {} : {},
      contactIds: [],
      createdBy: req.user.userId,
    });

    res.status(201).json({ success: true, segment });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to create segment" });
  }
};

const listSegments = async (req, res) => {
  try {
    const segments = await Segment.find({ companyId: req.companyId }).sort({ createdAt: -1 });

    const withCounts = await Promise.all(
      segments.map(async (segment) => {
        const contactCount =
          segment.type === "static"
            ? await Contact.countDocuments({ companyId: req.companyId, _id: { $in: segment.contactIds } })
            : await Contact.countDocuments({ ...buildContactFilter(segment.filter), companyId: req.companyId });
        return { ...segment.toObject(), contactCount };
      }),
    );

    res.status(200).json({ success: true, segments: withCounts });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to fetch segments" });
  }
};

const deleteSegment = async (req, res) => {
  try {
    const segment = await Segment.findOne({ _id: req.params.id, companyId: req.companyId });

    if (!segment) {
      return res.status(404).json({ success: false, message: "Segment not found" });
    }

    await Segment.deleteOne({ _id: segment._id });

    res.status(200).json({ success: true, message: "Segment deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to delete segment" });
  }
};

const getSegmentContacts = async (req, res) => {
  try {
    const segment = await Segment.findOne({ _id: req.params.id, companyId: req.companyId });

    if (!segment) {
      return res.status(404).json({ success: false, message: "Segment not found" });
    }

    const mongoFilter =
      segment.type === "static"
        ? { companyId: req.companyId, _id: { $in: segment.contactIds } }
        : { ...buildContactFilter(segment.filter), companyId: req.companyId };

    const contacts = await Contact.find(mongoFilter)
      .select("name phone optedOut")
      .limit(SAFETY_CAP);

    res.status(200).json({ success: true, contacts });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to fetch segment contacts" });
  }
};

// Add contacts to a "static" group's member list — the only way membership
// changes for this segment type, so it never happens as a side effect of
// unrelated contact/tag edits elsewhere.
const addContactsToSegment = async (req, res) => {
  try {
    const { contactIds } = req.body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ success: false, message: "No contacts provided" });
    }

    const segment = await Segment.findOne({ _id: req.params.id, companyId: req.companyId });

    if (!segment) {
      return res.status(404).json({ success: false, message: "Segment not found" });
    }

    if (segment.type !== "static") {
      return res.status(400).json({
        success: false,
        message: "Only a group (static segment) can have contacts added directly",
      });
    }

    // Defensive: only contacts belonging to this same company can be added,
    // even if a caller passed IDs from elsewhere.
    const validContacts = await Contact.find({
      _id: { $in: contactIds },
      companyId: req.companyId,
    }).select("_id");

    await Segment.updateOne(
      { _id: segment._id },
      { $addToSet: { contactIds: { $each: validContacts.map((c) => c._id) } } },
    );

    res.status(200).json({ success: true, message: "Contacts added to group" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to add contacts to group" });
  }
};

const removeContactFromSegment = async (req, res) => {
  try {
    const segment = await Segment.findOne({ _id: req.params.id, companyId: req.companyId });

    if (!segment) {
      return res.status(404).json({ success: false, message: "Segment not found" });
    }

    if (segment.type !== "static") {
      return res.status(400).json({
        success: false,
        message: "Only a group (static segment) can have contacts removed directly",
      });
    }

    await Segment.updateOne(
      { _id: segment._id },
      { $pull: { contactIds: req.params.contactId } },
    );

    res.status(200).json({ success: true, message: "Contact removed from group" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to remove contact from group" });
  }
};

module.exports = {
  createSegment,
  listSegments,
  deleteSegment,
  getSegmentContacts,
  addContactsToSegment,
  removeContactFromSegment,
};
