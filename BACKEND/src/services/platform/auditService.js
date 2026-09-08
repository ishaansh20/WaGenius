const AuditLog = require("../../models/auditLog");
const PlatformUser = require("../../models/platformUser");

/**
 * Logs an administrative action performed by a Super Admin
 */
const logAdminAction = async ({
  req,
  action,
  targetModel,
  targetId,
  targetName,
  details,
}) => {
  try {
    const actorId = req.platformUserId;
    if (!actorId) return null;

    const platformUser = await PlatformUser.findById(actorId).select("name email").lean();
    const actorName = platformUser?.name || "Super Admin";
    const actorEmail = platformUser?.email || "superadmin@wagenius.local";

    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "";

    const log = await AuditLog.create({
      actorId,
      actorName,
      actorEmail,
      action,
      targetModel,
      targetId: targetId || null,
      targetName: targetName || "",
      details: details || {},
      ipAddress,
    });

    return log;
  } catch (error) {
    console.error("Failed to write audit log:", error);
    return null;
  }
};

module.exports = {
  logAdminAction,
};
