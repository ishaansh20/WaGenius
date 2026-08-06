export const formatPhone = (phone = "") => {
  const cleaned = phone.toString();

  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+91 ${cleaned.slice(2)}`;
  }

  return phone;
};
