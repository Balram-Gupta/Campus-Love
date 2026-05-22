import { useEffect, useState } from "react";
import { api, imageUrl } from "../utils/api.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function SwipePage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    api("/api/swipe/users", { token }).then((data) => setUsers(data.users)).catch((error) => setStatus(error.message));
  }, [token]);

  const current = users[index];

  async function like() {
    if (!current) return;
    const data = await api(`/api/swipe/like/${current._id}`, { method: "POST", token });
    setStatus(data.matched ? "It is a match. Chat is enabled." : "Like sent.");
    setIndex((value) => value + 1);
  }

  async function skip() {
    if (!current) return;
    await api(`/api/swipe/skip/${current._id}`, { method: "POST", token });
    setStatus("Skipped.");
    setIndex((value) => value + 1);
  }

  return (
    <section className="page">
      <div className="section-title">
        <p>Discovery</p>
        <h1>Meet verified students</h1>
        <span>Review one profile at a time and choose who you want to match with.</span>
      </div>

      {!current && (
        <div className="panel mx-auto max-w-xl text-center">
          <p className="text-xs font-black uppercase text-campus-gold">All caught up</p>
          <h2 className="mt-2 text-2xl font-black">No more verified profiles right now.</h2>
          <p className="mt-2 text-campus-muted">Check back later as more students are approved.</p>
        </div>
      )}
      {current && (
        <article className="mx-auto grid max-w-5xl overflow-hidden rounded-lg border border-campus-line bg-white shadow-soft lg:grid-cols-[0.9fr_1fr]">
          <div className="relative min-h-[420px] bg-slate-100">
            <img className="absolute inset-0 h-full w-full object-cover" src={imageUrl(current.profilePhoto)} alt={current.name} />
            <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 text-sm font-black text-campus-teal shadow-sm">
              Verified
            </div>
          </div>
          <div className="flex flex-col justify-between gap-6 p-6">
            <div>
              <p className="text-xs font-black uppercase text-campus-gold">Profile {Math.min(index + 1, users.length)} of {users.length}</p>
              <h2 className="mt-2 text-4xl font-black">{current.name}, {current.age}</h2>
              <p className="mt-2 font-bold text-campus-muted">{current.department} | {current.semester}</p>
              <p className="mt-5 leading-8 text-campus-muted">{current.bio || "No bio added yet."}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(current.interests || []).map((item) => <span className="chip" key={item}>{item}</span>)}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button className="btn-secondary" type="button" onClick={skip}>Skip</button>
              <button className="btn-primary" type="button" onClick={like}>Like profile</button>
            </div>
          </div>
        </article>
      )}

      {status && <p className="mt-4 text-center font-bold text-campus-teal">{status}</p>}
    </section>
  );
}
