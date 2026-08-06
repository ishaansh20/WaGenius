const Contact = require("../models/contact");

// Single source of truth for "find or create a contact by phone" across every
// entry point (inbound WhatsApp messages, manual add, CSV import, campaign
// upload). Preserves the original name-merge rule from
// whatsapp/messageService.js: never clobber a real name with a blank one, and
// never overwrite a name that's already something other than the phone
// placeholder.
const findOrCreateContact = async ({ companyId, phone, name, source = "whatsapp", tags }) => {
  let contact = await Contact.findOne({ companyId, phone });

  if (!contact) {
    contact = await Contact.create({
      companyId,
      phone,
      name: name || phone,
      source,
      tags: tags || [],
    });

    return { contact, created: true, updated: false };
  }

  let changed = false;

  if (name && (contact.name === phone || !contact.name)) {
    contact.name = name;
    changed = true;
  }

  if (tags?.length) {
    const merged = new Set([...(contact.tags || []), ...tags]);

    if (merged.size !== (contact.tags || []).length) {
      contact.tags = [...merged];
      changed = true;
    }
  }

  if (changed) await contact.save();

  return { contact, created: false, updated: changed };
};

module.exports = { findOrCreateContact };
