import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../state/AuthContext.jsx";
import { api, SOCKET_URL } from "../utils/api.js";

export default function NotificationBell() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const deleteTimerRef = useRef(null);

  useEffect(() => {
    const loadNotifications = () => {
      api("/api/notifications", { token }).then((data) => setItems(data.notifications)).catch(() => {});
    };

    loadNotifications();
    const socket = io(SOCKET_URL, { auth: { token } });
    socket.on("notification", (notification) => setItems((current) => [notification, ...current]));
    socket.on("notifications:refresh", loadNotifications);
    socket.on("announcement:new", (announcement) => {
      setItems((current) => [
        { _id: announcement._id, title: announcement.title, body: announcement.body, read: false },
        ...current
      ]);
    });
    return () => {
      socket.disconnect();
      clearTimeout(deleteTimerRef.current);
    };
  }, [token]);

  function handleToggle(event) {
    if (!event.currentTarget.open || items.length === 0) {
      return;
    }

    clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = setTimeout(() => {
      api("/api/notifications", { method: "DELETE", token }).catch(() => {});
      setItems([]);
    }, 2000);
  }

  const unread = items.filter((item) => !item.read).length;
  return (
    <details className="relative" onToggle={handleToggle}>
      <summary className="btn-secondary list-none">Notifications {unread > 0 ? `(${unread})` : ""}</summary>
      <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-campus-line bg-white p-3 shadow-soft">
        {items.length === 0 && <p className="text-sm text-campus-muted">No notifications yet.</p>}
        {items.slice(0, 6).map((item) => (
          <article key={item._id} className="border-b border-campus-line py-2 last:border-0">
            <h3 className="font-black">{item.title}</h3>
            <p className="text-sm text-campus-muted">{item.body}</p>
          </article>
        ))}
      </div>
    </details>
  );
}
