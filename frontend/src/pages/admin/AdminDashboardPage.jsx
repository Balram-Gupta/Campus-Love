import { useEffect, useMemo, useState } from "react";
import { api, imageUrl } from "../../utils/api.js";
import { useAuth } from "../../state/AuthContext.jsx";

const tabs = [
  ["pending", "Pending approval"],
  ["approved", "Approved users"],
  ["rejected", "Rejected"],
  ["blocked", "Blocked"]
];

const emptyCopy = {
  pending: "No student profiles are waiting for approval.",
  approved: "No approved users yet.",
  rejected: "No rejected profiles.",
  blocked: "No blocked users."
};

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [activeStatus, setActiveStatus] = useState("pending");
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({});
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState("");

  const totalReviewed = useMemo(() => (counts.approved || 0) + (counts.rejected || 0) + (counts.blocked || 0), [counts]);

  function load(statusValue = activeStatus) {
    api(`/api/admin/users?status=${statusValue}`, { token })
      .then((data) => {
        setUsers(data.users);
        setCounts(data.counts || {});
      })
      .catch((error) => setStatus(error.message));
  }

  useEffect(() => {
    load(activeStatus);
  }, [activeStatus, token]);

  async function decide(id, action) {
    try {
      setBusyId(id);
      await api(`/api/admin/${action}/${id}`, { method: "PUT", token });
      setStatus(action === "approve" ? "User approved and notified." : "User rejected and notified.");
      load();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusyId("");
    }
  }

  async function blockUser(id) {
    try {
      setBusyId(id);
      await api(`/api/admin/block-user/${id}`, { method: "PUT", token });
      setStatus("User blocked.");
      load();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusyId("");
    }
  }

  async function removeUser(id) {
    try {
      setBusyId(id);
      await api(`/api/admin/users/${id}`, { method: "DELETE", token });
      setStatus("User deleted.");
      load();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusyId("");
    }
  }

  async function announce(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/admin/announcements", {
        method: "POST",
        token,
        body: { title: form.get("title"), body: form.get("body") }
      });
      event.currentTarget.reset();
      setStatus("Announcement sent.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="page">
      <div className="section-title">
        <p>Admin dashboard</p>
        <h1>Approve and manage student users</h1>
        <span>Review ID cards, approve real campus accounts, reject bad submissions, and keep approved users visible in one place.</span>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <article className="admin-stat">
          <p className="text-xs font-black uppercase text-campus-gold">Pending</p>
          <strong className="text-3xl">{counts.pending || 0}</strong>
        </article>
        <article className="admin-stat">
          <p className="text-xs font-black uppercase text-campus-gold">Approved</p>
          <strong className="text-3xl">{counts.approved || 0}</strong>
        </article>
        <article className="admin-stat">
          <p className="text-xs font-black uppercase text-campus-gold">Needs attention</p>
          <strong className="text-3xl">{(counts.rejected || 0) + (counts.blocked || 0)}</strong>
        </article>
        <article className="admin-stat">
          <p className="text-xs font-black uppercase text-campus-gold">Reviewed</p>
          <strong className="text-3xl">{totalReviewed}</strong>
        </article>
      </div>

      {status && <p className="status-info">{status}</p>}

      <form className="panel mb-5 grid gap-3 md:grid-cols-[1fr_2fr_auto]" onSubmit={announce}>
        <input name="title" placeholder="Announcement title" required />
        <input name="body" placeholder="Announcement message" required />
        <button className="btn-primary" type="submit">Add announcement</button>
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(([value, label]) => (
          <button
            className={`admin-tab ${activeStatus === value ? "active" : ""}`}
            key={value}
            onClick={() => {
              setStatus("");
              setActiveStatus(value);
            }}
            type="button"
          >
            {label} ({counts[value] || 0})
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {users.length === 0 && (
          <article className="panel">
            <p className="text-campus-muted">{emptyCopy[activeStatus]}</p>
          </article>
        )}
        {users.map((user) => (
          <article className="panel" key={user._id}>
            <div className="grid gap-4 md:grid-cols-[190px_1fr]">
              <a href={imageUrl(user.studentIdCard)} target="_blank" rel="noreferrer" className="block">
                <img className="h-48 w-full rounded-lg border border-campus-line object-cover" src={imageUrl(user.studentIdCard)} alt={`${user.name} ID card`} />
              </a>
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="rounded-full bg-[#dcefea] px-3 py-1 text-xs font-black uppercase text-[#075e5a]">{user.verificationStatus}</p>
                  <p className="text-xs font-bold text-campus-muted">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <h2 className="text-2xl font-black">{user.name}</h2>
                <p className="break-all text-campus-muted">{user.email}</p>
                <div className="mt-3 grid gap-1 text-sm text-campus-muted">
                  <p><span className="font-black text-campus-ink">Roll:</span> {user.rollNumber}</p>
                  <p><span className="font-black text-campus-ink">Age:</span> {user.age}</p>
                  <p><span className="font-black text-campus-ink">Program:</span> {user.department} | {user.course} | {user.semester}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {user.verificationStatus !== "approved" && (
                    <button className="btn-primary" disabled={busyId === user._id} onClick={() => decide(user._id, "approve")}>Approve</button>
                  )}
                  {user.verificationStatus === "pending" && (
                    <button className="btn-secondary" disabled={busyId === user._id} onClick={() => decide(user._id, "reject")}>Reject</button>
                  )}
                  {user.verificationStatus === "approved" && (
                    <button className="btn-secondary" disabled={busyId === user._id} onClick={() => blockUser(user._id)}>Block</button>
                  )}
                  {user.verificationStatus !== "approved" && (
                    <button className="btn-secondary" disabled={busyId === user._id} onClick={() => removeUser(user._id)}>Delete</button>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
