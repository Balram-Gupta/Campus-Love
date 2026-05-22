import { useEffect, useState } from "react";
import { api, imageUrl } from "../utils/api.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function SettingsPage() {
  const { token, user, updateUser } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api("/api/users/blocked", { token })
      .then((data) => setBlockedUsers(data.blockedUsers || []))
      .catch((error) => setStatus(error.message));
  }, [token]);

  async function unblockUser(userId) {
    try {
      const data = await api(`/api/block/${userId}`, { method: "DELETE", token });
      setBlockedUsers((current) => current.filter((user) => user._id !== userId));
      updateUser({ ...user, blockedUsers: data.blockedUsers || [] });
      setStatus("User unblocked");
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="page">
      <div className="section-title">
        <p>Settings Page</p>
        <h1>Privacy and safety settings</h1>
        <span>Control who can reach you and review the people you have blocked.</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <article className="panel">
          <h2 className="text-xl font-black">Privacy</h2>
          <p className="mt-2 text-campus-muted">Do not expose phone number, exact location, dorm room, timetable, or student ID image to other users.</p>
        </article>
        <article className="panel">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-campus-gold">Blocked users</p>
              <h2 className="text-xl font-black">People you blocked</h2>
            </div>
            <span className="text-sm font-bold text-campus-muted">{blockedUsers.length} blocked</span>
          </div>
          {status && <p className="status-info mb-4">{status}</p>}
          {blockedUsers.length ? (
            <div className="grid gap-3">
              {blockedUsers.map((blockedUser) => (
                <div key={blockedUser._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-campus-line p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img className="h-14 w-14 rounded-lg object-cover" src={imageUrl(blockedUser.profilePhoto)} alt={blockedUser.name} />
                    <div className="min-w-0">
                      <h3 className="font-black">{blockedUser.name}</h3>
                      <p className="truncate text-sm text-campus-muted">{blockedUser.department} | {blockedUser.course} | {blockedUser.semester}</p>
                    </div>
                  </div>
                  <button className="btn-secondary" type="button" onClick={() => unblockUser(blockedUser._id)}>Unblock</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-campus-muted">You have not blocked anyone.</p>
          )}
        </article>
      </div>
    </section>
  );
}
