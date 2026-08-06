import { API_BASE_URL } from "../services/api";

export function resolveMediaUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.replace(/\\/g, "/").replace(/^\/?/, "/")}`;
}
