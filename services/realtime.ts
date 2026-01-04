import { io, Socket } from "socket.io-client";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "https://b2uprog.onrender.com";

declare global {
  interface Window {
    __b2u_socket__?: Socket;
  }
}

export function getSocket(): Socket {
  if (typeof window !== "undefined" && window.__b2u_socket__) {
    return window.__b2u_socket__!;
  }

  const s = io(API_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 50,
    reconnectionDelay: 1000,
    withCredentials: true,
  });

  if (typeof window !== "undefined") window.__b2u_socket__ = s;
  return s;
}