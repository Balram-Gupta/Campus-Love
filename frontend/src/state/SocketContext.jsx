import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../utils/api.js";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const socketRef = useRef(null);
  const currentUserId = String(user?._id || user?.id || "");

  useEffect(() => {
    if (!token || !user || user.role === "admin") {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIncomingCall(null);
      return undefined;
    }

    const nextSocket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = nextSocket;
    setSocket(nextSocket);

    nextSocket.on("call:offer", ({ from, matchId, offer }) => {
      if (String(from) === currentUserId) return;
      setIncomingCall({ from, matchId, offer, receivedAt: Date.now() });
    });

    nextSocket.on("call:end", ({ matchId }) => {
      setIncomingCall((current) => (current?.matchId === matchId ? null : current));
    });

    return () => {
      nextSocket.disconnect();
      if (socketRef.current === nextSocket) {
        socketRef.current = null;
      }
      setSocket((current) => (current === nextSocket ? null : current));
    };
  }, [token, user, currentUserId]);

  function clearIncomingCall() {
    setIncomingCall(null);
  }

  function declineIncomingCall() {
    if (incomingCall?.matchId) {
      socketRef.current?.emit("call:end", { matchId: incomingCall.matchId });
    }
    setIncomingCall(null);
  }

  const value = useMemo(() => ({
    socket,
    incomingCall,
    setIncomingCall,
    clearIncomingCall,
    declineIncomingCall
  }), [socket, incomingCall]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useAppSocket() {
  return useContext(SocketContext);
}
