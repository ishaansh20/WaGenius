let io;

const initSocket = (server) => {
  const { Server } = require("socket.io");
  const { verifyJwt } = require("../middlewares/authMiddleware");
  const { SOCKET_ROOMS } = require("../constants/socketRooms");

  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  // Without this, anyone who finds the Socket.IO URL can connect and
  // receive every message/conversation/campaign event broadcast to all
  // clients — same JWT every REST request already requires, just checked
  // once at handshake instead of per-request.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: no token provided"));
    }

    try {
      socket.user = verifyJwt(token);
      next();
    } catch (error) {
      next(new Error("Authentication error: invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User Connected:", socket.id, "user:", socket.user?.userId);

    // Clients join whichever feature-area room(s) match the page(s) they
    // currently have open — see constants/socketRooms.js for why these are
    // feature-area rooms rather than per-conversation ones.
    // Rooms are per company: a client asking for "inbox" joins
    // "company:<id>:inbox", taken from its verified token, so one company
    // never receives another company's events.
    socket.on("join_room", (room) => {
      if (!SOCKET_ROOMS.includes(room)) return;
      const companyId = socket.user?.companyId;
      if (!companyId) return;
      socket.join(companyRoom(companyId, room));
    });

    socket.on("leave_room", (room) => {
      if (!SOCKET_ROOMS.includes(room)) return;
      const companyId = socket.user?.companyId;
      if (!companyId) return;
      socket.leave(companyRoom(companyId, room));
    });

    socket.on("disconnect", () => {
      console.log("User Disconnected:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
};

const companyRoom = (companyId, room) => `company:${String(companyId)}:${room}`;

/**
 * The only way the server should broadcast. Sends `event` to the clients of
 * one company that have joined `room` ("inbox" | "campaigns" | "templates").
 * Without a companyId nothing is sent — never fall back to a global room.
 */
const emitToCompany = (companyId, room, event, payload) => {
  if (!io) return;
  if (!companyId) {
    console.warn(`[socket] skipped "${event}" on "${room}": no companyId`);
    return;
  }
  io.to(companyRoom(companyId, room)).emit(event, payload);
};

module.exports = {
  initSocket,
  getIO,
  emitToCompany,
  companyRoom,
};
