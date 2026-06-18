import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";


// Tipos para eventos
export interface NotificationEvent {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  isRead: boolean;
  createdAt: Date;
}

export interface MetricEvent {
  id: number;
  name: string;
  value: string;
  unit: string;
  timestamp: Date;
}

export interface UserActivityEvent {
  userId: number;
  action: string;
  resource: string;
  timestamp: Date;
}

// Mapa de usuarios conectados
const connectedUsers = new Map<string, { userId: number; socketId: string }>();

export function setupSocketIO(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? undefined : "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Middleware de autenticación
  io.use((socket, next) => {
    const userId = socket.handshake.query.userId as string;
    if (!userId) {
      return next(new Error("Authentication error"));
    }
    socket.data.userId = parseInt(userId);
    next();
  });

  // Conexión
  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    console.log(`[Socket.io] User ${userId} connected: ${socket.id}`);

    // Registrar usuario conectado
    connectedUsers.set(socket.id, { userId, socketId: socket.id });

    // Unirse a sala de usuario
    socket.join(`user:${userId}`);

    // Evento: Usuario conectado
    socket.emit("connected", {
      socketId: socket.id,
      userId,
      timestamp: new Date(),
    });

    // Broadcast a otros usuarios
    io.emit("user:online", {
      userId,
      timestamp: new Date(),
    });

    // Desconexión
    socket.on("disconnect", () => {
      connectedUsers.delete(socket.id);
      console.log(`[Socket.io] User ${userId} disconnected: ${socket.id}`);

      io.emit("user:offline", {
        userId,
        timestamp: new Date(),
      });
    });

    // Evento: Ping (para mantener conexión viva)
    socket.on("ping", () => {
      socket.emit("pong");
    });
  });

  return io;
}

// Funciones para emitir eventos desde el backend

export function notifyUser(io: SocketIOServer, userId: number, notification: NotificationEvent) {
  io.to(`user:${userId}`).emit("notification:new", notification);
  console.log(`[Socket.io] Notification sent to user ${userId}`);
}

export function notifyAllUsers(io: SocketIOServer, notification: NotificationEvent) {
  io.emit("notification:broadcast", notification);
  console.log(`[Socket.io] Notification broadcasted to all users`);
}

export function updateMetric(io: SocketIOServer, metric: MetricEvent) {
  io.emit("metric:updated", metric);
  console.log(`[Socket.io] Metric updated: ${metric.name}`);
}

export function broadcastActivity(io: SocketIOServer, activity: UserActivityEvent) {
  io.emit("activity:log", activity);
  console.log(`[Socket.io] Activity logged: ${activity.action}`);
}

export function notifyTyping(io: SocketIOServer, userId: number, conversationId: number, isTyping: boolean) {
  io.emit("chat:typing", {
    userId,
    conversationId,
    isTyping,
    timestamp: new Date(),
  });
}

export function broadcastChatMessage(
  io: SocketIOServer,
  conversationId: number,
  message: { role: string; content: string; timestamp: Date }
) {
  io.emit("chat:message", {
    conversationId,
    ...message,
  });
}

export function getConnectedUsers() {
  return Array.from(connectedUsers.values());
}

export function getConnectedUserCount() {
  return connectedUsers.size;
}
