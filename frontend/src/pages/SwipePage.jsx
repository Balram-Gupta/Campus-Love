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
  const currentPhotos = current ? [current.profilePhoto, ...(current.photos || [])].filter(Boolean) : [];
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    setPhotoIndex(0);
  }, [current?._id]);

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
        <article className="swipe-card mx-auto grid max-w-5xl overflow-hidden rounded-lg border border-campus-line bg-white shadow-soft lg:grid-cols-[0.9fr_1fr]">
          <div className="relative min-h-[430px] bg-slate-100 sm:min-h-[520px] lg:min-h-[520px]">
            <img className="absolute inset-0 h-full w-full object-cover" src={imageUrl(currentPhotos[photoIndex] || current.profilePhoto)} alt={current.name} />
            <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-2 text-sm font-black text-campus-teal shadow-sm">
              Verified
            </div>
            {currentPhotos.length > 1 && (
              <div className="absolute inset-x-3 bottom-3 flex gap-2 overflow-x-auto rounded-lg bg-white/82 p-2 backdrop-blur">
                {currentPhotos.map((photo, photoPosition) => (
                  <button
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${photoPosition === photoIndex ? "border-campus-teal" : "border-white"}`}
                    key={`${photo}-${photoPosition}`}
                    type="button"
                    onClick={() => setPhotoIndex(photoPosition)}
                    aria-label={`Show photo ${photoPosition + 1}`}
                  >
                    <img className="h-full w-full object-cover" src={imageUrl(photo)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-between gap-5 p-4 sm:p-6">
            <div>
              <p className="text-xs font-black uppercase text-campus-gold">Profile {Math.min(index + 1, users.length)} of {users.length}</p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">{current.name}, {current.age}</h2>
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
