import { io, type Socket } from "socket.io-client";

export function getServerUrl(): string {
  return import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";
}

export function createSocket(): Socket {
  return io(getServerUrl(), {
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
}
