const prepareMessage = (message, contact) => {
  return message.replace(/\{\{1\}\}/g, contact.name || "Customer");
};

module.exports = prepareMessage;
