import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

export interface SocketEvents {
  "notification:new": (notification: any) => void;
  "notification:broadcast": (notification: any) => void;
  "metric:updated": (metric: any) => void;
  "activity:log": (activity: any) => void;
  "chat:typing": (data: any) => void;
  "chat:message": (data: any) => void;
  "user:online": (data: any) => void;
  "user:offline": (data: any) => void;
  connected: (data: any) => void;
  pong: () => void;
}

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [listeners, setListeners] = useState<Map<string, Set<Function>>>(new Map());

  useEffect(() => {
    if (!user) return;

    // Crear conexión Socket.io
    const socket = io(window.location.origin, {
      query: {
        userId: user.id,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket.io] Connected:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[Socket.io] Disconnected");
      setIsConnected(false);
    });

    socket.on("error", (error) => {
      console.error("[Socket.io] Error:", error);
    });

    // Ping/Pong para mantener conexión
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping");
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      socket.disconnect();
    };
  }, [user]);

  const on = useCallback(
    (event: string, callback: Function) => {
      if (!socketRef.current) return;

      socketRef.current.on(event, callback as any);

      // Guardar listener para limpieza
      setListeners((prev) => {
        const newListeners = new Map(prev);
        if (!newListeners.has(event)) {
          newListeners.set(event, new Set());
        }
        newListeners.get(event)!.add(callback);
        return newListeners;
      });

      // Retornar función para desuscribirse
      return () => {
        socketRef.current?.off(event, callback as any);
        setListeners((prev) => {
          const newListeners = new Map(prev);
          newListeners.get(event)?.delete(callback);
          return newListeners;
        });
      };
    },
    []
  );

  const emit = useCallback((event: string, data?: any) => {
    if (!socketRef.current?.connected) {
      console.warn("[Socket.io] Socket not connected, cannot emit:", event);
      return;
    }
    socketRef.current.emit(event, data);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    on,
    emit,
  };
}
