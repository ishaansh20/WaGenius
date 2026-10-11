const { resolveValue } = require("../../utils/sheetFields");

// Personalises a plain (non-template) campaign message for one contact.
// Supports the legacy {{1}} (contact name) plus {{contact_name}} and
// {{col:<key>}} from the uploaded sheet.
const prepareMessage = (message, contact) => {
  const withName = String(message || "").replace(/\{\{1\}\}/g, contact.name || "Customer");
  return withName.replace(/\{\{(contact_name|col:[a-z0-9_]+)\}\}/g, (token) => resolveValue(token, contact));
};

module.exports = prepareMessage;
