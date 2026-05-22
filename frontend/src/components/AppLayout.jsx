import { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Outlet } from "react-router-dom";
import NotificationBell from "./NotificationBell.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import { api, imageUrl } from "../utils/api.js";

const links = [
  ["Swipe", "/swipe"],
  ["Matches", "/matches"],
  ["Chat", "/chat"],
  ["Profile", "/profile"],
  ["Settings", "/settings"]
];

export default function AppLayout() {
  const { token, user, logout } = useAuth();
  const [nearbyStatus, setNearbyStatus] = useState(localStorage.getItem("campuslove_nearby_alerts") === "on" ? "on" : "idle");
  const lastLocationSharedAtRef = useRef(0);

  useEffect(() => {
    if (nearbyStatus !== "on" || !token || !navigator.geolocation) {
      return undefined;
    }

    const shareLocation = (position) => {
      const now = Date.now();
      if (now - lastLocationSharedAtRef.current < 60000) {
        return;
      }
      lastLocationSharedAtRef.current = now;
      api("/api/users/location", {
        method: "POST",
        token,
        body: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        },
        timeout: 5000
      }).catch(() => {});
    };

    navigator.geolocation.getCurrentPosition(shareLocation, () => setNearbyStatus("denied"), { enableHighAccuracy: true });
    const watchId = navigator.geolocation.watchPosition(shareLocation, () => setNearbyStatus("denied"), {
      enableHighAccuracy: true,
      maximumAge: 60000,
      timeout: 15000
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [nearbyStatus, token]);

  function enableNearbyAlerts() {
    if (!navigator.geolocation) {
      setNearbyStatus("unsupported");
      return;
    }
    localStorage.setItem("campuslove_nearby_alerts", "on");
    setNearbyStatus("on");
  }

  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <main className="min-h-screen bg-campus-paper text-campus-ink lg:grid lg:grid-cols-[284px_1fr]">
      <aside className="border-b border-campus-line bg-white/95 p-4 shadow-sm lg:sticky lg:top-0 lg:min-h-screen lg:border-b-0 lg:border-r lg:p-5">
        <NavLink to="/swipe" className="mb-6 flex items-center gap-3 rounded-lg border border-campus-line bg-campus-paper p-3 transition hover:border-campus-teal">
          <img className="h-12 w-12 rounded-lg object-cover ring-2 ring-white" src={imageUrl(user?.profilePhoto)} alt={user?.name || "Profile"} />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-campus-gold">Campus verified</p>
            <h1 className="truncate text-xl font-black">{user?.name || "CampusLove"}</h1>
          </div>
        </NavLink>

        <nav className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {links.map(([label, href]) => (
            <NavLink key={href} to={href} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 rounded-lg border border-campus-line bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase text-campus-gold">Signed in</p>
          <p className="font-black">{user?.name || "Guest"}</p>
          {user && <p className="text-sm text-campus-muted">{user.email}</p>}
          {user && <button className="btn-secondary mt-3 w-full" onClick={logout}>Log out</button>}
        </div>
      </aside>

      <section className="min-w-0">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-campus-line bg-white/90 p-5 backdrop-blur">
          <div>
            <p className="text-xs font-black uppercase text-campus-gold">University only</p>
            <h2 className="text-2xl font-black">Safe campus dating</h2>
          </div>
          {user && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="btn-secondary"
                type="button"
                disabled={nearbyStatus === "on"}
                onClick={enableNearbyAlerts}
                title={nearbyStatus === "denied" ? "Allow location permission in your browser to use nearby alerts" : undefined}
              >
                {nearbyStatus === "on" ? "Nearby alerts on" : "Enable nearby alerts"}
              </button>
              <NotificationBell />
            </div>
          )}
        </header>
        <Outlet />
      </section>
    </main>
  );
}
