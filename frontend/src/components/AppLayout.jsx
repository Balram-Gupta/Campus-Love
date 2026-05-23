import { useEffect, useRef, useState } from "react";
import { Heart, LogOut, MessageCircle, Settings, Sparkles, UserRound, UsersRound, X } from "lucide-react";
import { Navigate, NavLink, Outlet } from "react-router-dom";
import IncomingCallOverlay from "./IncomingCallOverlay.jsx";
import NotificationBell from "./NotificationBell.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import { SocketProvider } from "../state/SocketContext.jsx";
import { api, imageUrl } from "../utils/api.js";

const links = [
  { label: "Swipe", href: "/swipe", Icon: Sparkles },
  { label: "Matches", href: "/matches", Icon: Heart },
  { label: "Chat", href: "/chat", Icon: MessageCircle },
  { label: "Profile", href: "/profile", Icon: UserRound },
  { label: "Settings", href: "/settings", Icon: Settings }
];

export default function AppLayout() {
  const { token, user, logout } = useAuth();
  const [nearbyStatus, setNearbyStatus] = useState(localStorage.getItem("campuslove_nearby_alerts") === "on" ? "on" : "idle");
  const [menuOpen, setMenuOpen] = useState(false);
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
    <SocketProvider>
      <main className="min-h-screen bg-campus-paper pb-20 text-campus-ink lg:grid lg:grid-cols-[284px_1fr] lg:pb-0">
      <aside className="hidden border-b border-campus-line bg-white/95 p-4 shadow-sm lg:sticky lg:top-0 lg:block lg:min-h-screen lg:border-b-0 lg:border-r lg:p-5">
        <NavLink to="/swipe" className="mb-6 flex items-center gap-3 rounded-lg border border-campus-line bg-campus-paper p-3 transition hover:border-campus-teal">
          <img className="h-12 w-12 rounded-lg object-cover ring-2 ring-white" src={imageUrl(user?.profilePhoto)} alt={user?.name || "Profile"} />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-campus-gold">Campus verified</p>
            <h1 className="truncate text-xl font-black">{user?.name || "CampusLove"}</h1>
          </div>
        </NavLink>

        <nav className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {links.map(({ label, href, Icon }) => (
            <NavLink key={href} to={href} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
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
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-campus-line bg-white/95 px-3 py-2.5 backdrop-blur lg:hidden">
          <NavLink to="/swipe" className="flex min-w-0 items-center gap-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-campus-teal text-white">
              <UsersRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-black uppercase text-campus-gold">CampusLove</span>
              <span className="block truncate text-base font-black">{user?.name || "Swipe"}</span>
            </span>
          </NavLink>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border-2 border-white bg-campus-paper shadow-sm ring-1 ring-campus-line"
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Open account menu"
              aria-expanded={menuOpen}
            >
              <img className="h-full w-full object-cover" src={imageUrl(user?.profilePhoto)} alt={user?.name || "Profile"} />
            </button>
          </div>
          {menuOpen && (
            <div className="absolute right-3 top-[calc(100%+0.5rem)] z-40 w-60 overflow-hidden rounded-lg border border-campus-line bg-white shadow-soft">
              <div className="flex items-center justify-between gap-3 border-b border-campus-line p-3">
                <div className="min-w-0">
                  <p className="truncate font-black">{user?.name || "Guest"}</p>
                  <p className="truncate text-xs font-bold text-campus-muted">{user?.email}</p>
                </div>
                <button className="grid h-9 w-9 place-items-center rounded-lg border border-campus-line" type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="grid p-2">
                {links.slice(1).map(({ label, href, Icon }) => (
                  <NavLink key={href} to={href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-black text-campus-ink hover:bg-campus-paper">
                    <Icon className="h-4 w-4 text-campus-teal" aria-hidden="true" />
                    <span>{label}</span>
                  </NavLink>
                ))}
                <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-black text-campus-rose hover:bg-red-50" type="button" onClick={logout}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </header>

        <header className="sticky top-0 z-30 hidden flex-wrap items-center justify-between gap-3 border-b border-campus-line bg-white/90 p-5 backdrop-blur lg:flex">
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
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-campus-line bg-white/95 px-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        {links.map(({ label, href, Icon }) => (
          <NavLink key={href} to={href} className={({ isActive }) => `mobile-tab ${isActive ? "active" : ""}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <IncomingCallOverlay />
    </main>
    </SocketProvider>
  );
}
