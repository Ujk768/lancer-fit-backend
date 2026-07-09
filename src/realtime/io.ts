// src/realtime/io.ts
//
// One shared Socket.IO server for the whole app. Controllers import `emit`
// and fire named events; the two frontends subscribe to them.

import { Server as HttpServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";

let io: IOServer | null = null;

interface AuthedTokenPayload {
  userId: number;
  role: string;
  name: string;
}

export function initSocket(httpServer: HttpServer, origins: string[]) {
  io = new IOServer(httpServer, {
    cors: { origin: origins, credentials: true },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("No token"));
    try {
      const decoded = verifyAccessToken(token) as AuthedTokenPayload;
      (socket.data as AuthedTokenPayload) = decoded;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data as AuthedTokenPayload;
    socket.join(`user:${user.userId}`);
    socket.join(user.role === "admin" ? "admins" : "students");
  });

  return io;
}

export function emitToRoom(room: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(room).emit(event, payload);
}

export const emit = {
  toAllStudents: (event: string, payload: unknown) =>
    emitToRoom("students", event, payload),
  toAllAdmins: (event: string, payload: unknown) =>
    emitToRoom("admins", event, payload),
  toUser: (userId: number, event: string, payload: unknown) =>
    emitToRoom(`user:${userId}`, event, payload),
  toEveryone: (event: string, payload: unknown) => {
    if (!io) return;
    io.emit(event, payload);
  },
};

export function getIO() {
  return io;
}