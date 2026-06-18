import React, { createContext, useContext } from "react";
import { useSocket } from "@/hooks/useSocket";

interface SocketContextType {
  isConnected: boolean;
  on: (event: string, callback: Function) => (() => void) | undefined;
  emit: (event: string, data?: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isConnected, on, emit } = useSocket();

  return (
    <SocketContext.Provider value={{ isConnected, on, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within SocketProvider");
  }
  return context;
}
