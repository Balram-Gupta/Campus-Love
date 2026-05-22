import { NavLink, Outlet } from "react-router-dom";
import NotificationBell from "./NotificationBell.jsx";
import { useAuth } from "../state/AuthContext.jsx";

const adminLinks = [
  ["Review queue", "/admin"],
  ["Safety reports", "/admin/reports"]
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-[#eef3f1] text-campus-ink lg:grid lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-[#cddbd6] bg-[#102825] p-5 text-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <NavLink to="/admin" className="mb-7 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-campus-gold font-black text-[#102825]">AD</span>
          <div>
            <p className="text-xs font-black uppercase text-[#d6b25f]">Admin console</p>
            <h1 className="text-xl font-black">CampusLove</h1>
          </div>
        </NavLink>

        <nav className="grid gap-2">
          {adminLinks.map(([label, href]) => (
            <NavLink key={href} to={href} end={href === "/admin"} className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-7 rounded-lg border border-white/15 bg-white/10 p-4">
          <p className="text-xs font-black uppercase text-[#d6b25f]">Signed in as admin</p>
          <p className="mt-1 font-black">{user?.name || "Admin"}</p>
          {user && <p className="break-all text-sm text-white/70">{user.email}</p>}
          {user && <button className="admin-logout mt-4 w-full" onClick={logout}>Log out</button>}
        </div>
      </aside>

      <section className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cddbd6] bg-white p-5">
          <div>
            <p className="text-xs font-black uppercase text-campus-gold">Verification control</p>
            <h2 className="text-2xl font-black">Student approval desk</h2>
          </div>
          {user && <NotificationBell />}
        </header>
        <Outlet />
      </section>
    </main>
  );
}
