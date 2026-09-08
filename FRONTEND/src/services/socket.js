import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL;

let socket;

// Feature-area rooms the app currently wants to be in (see backend's
// constants/socketRooms.js). Tracked client-side so a dropped-and-restored
// connection (network blip, server restart) rejoins everything instead of
// silently going deaf on whichever page is open — room membership lives on
// the connection, not the account, so it doesn't survive a reconnect on
// its own.
const joinedRooms = new Set();

export function createInboxSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      auth: { token: localStorage.getItem("token") },
    });

    socket.on("connect", () => {
      joinedRooms.forEach((room) => socket.emit("join_room", room));
    });
  }

  return socket;
}

export function getInboxSocket() {
  return createInboxSocket();
}

export function joinRoom(room) {
  joinedRooms.add(room);
  createInboxSocket().emit("join_room", room);
}

export function leaveRoom(room) {
  joinedRooms.delete(room);
  socket?.emit("leave_room", room);
}

// Called on logout — without this, a stale socket authenticated as the
// previous user would keep receiving events (or a rejected reconnect loop)
// instead of the next login getting a fresh, correctly-authenticated one.
export function resetInboxSocket() {
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
  joinedRooms.clear();
}
