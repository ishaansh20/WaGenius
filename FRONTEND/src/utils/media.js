import { API_BASE_URL } from "../services/api";

export function resolveMediaUrl(path) {
  if (!path) return "";
  if (/^(https?|blob|data):/i.test(path)) return path;
  const clean = path.replace(/\\/g, "/");
  const normalized = clean.startsWith("/") ? clean : `/${clean}`;
  return `${API_BASE_URL}${normalized}`;
}
