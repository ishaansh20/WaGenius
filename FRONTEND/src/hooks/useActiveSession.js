import useAuthStore from "../store/authStore";
import usePlatformAuthStore from "../store/platformAuthStore";
import { getActiveSessionPath } from "../utils/sessionHome";

// Signed-in visitors on public pages get a link into their app instead of
// an automatic redirect. Returns { path, label } or null.
export default function useActiveSession() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setupStatus = useAuthStore((s) => s.setupStatus);
  const platformToken = usePlatformAuthStore((s) => s.platformToken);
  return getActiveSessionPath({ token, user, setupStatus, platformToken });
}
