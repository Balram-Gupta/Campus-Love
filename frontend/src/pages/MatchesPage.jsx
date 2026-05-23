import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, imageUrl } from "../utils/api.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function MatchesPage() {
  const { token, user } = useAuth();
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    api("/api/matches", { token }).then((data) => setMatches(data.matches)).catch(() => {});
  }, [token]);

  return (
    <section className="page">
      <div className="section-title">
        <p>Matches</p>
        <h1>Your matches</h1>
        <span>Chat, voice call, and video call are available only after a match.</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {matches.map((match) => {
          const currentUserId = String(user?._id || user?.id || "");
          const other = match.users.find((item) => String(item._id) !== currentUserId);
          const photos = [other?.profilePhoto, ...(other?.photos || [])].filter(Boolean);
          return (
            <article className="panel" key={match._id}>
              <img className="h-64 w-full rounded-lg object-cover" src={imageUrl(other?.profilePhoto)} alt={other?.name} />
              <h2 className="mt-4 text-2xl font-black">{other?.name}</h2>
              <p className="font-bold text-campus-muted">{other?.department} | {other?.semester}</p>
              {photos.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {photos.slice(0, 8).map((photo, photoIndex) => (
                    <a className="block overflow-hidden rounded-lg border border-campus-line bg-campus-paper" href={imageUrl(photo)} target="_blank" rel="noreferrer" key={`${photo}-${photoIndex}`}>
                      <img className="h-20 w-full object-cover" src={imageUrl(photo)} alt={`${other?.name || "Match"} photo ${photoIndex + 1}`} />
                    </a>
                  ))}
                </div>
              )}
              <Link className="btn-primary mt-4 w-full text-center" to={`/chat/${match._id}`}>Open chat</Link>
            </article>
          );
        })}
      </div>
      {!matches.length && (
        <div className="panel max-w-xl text-center">
          <p className="text-xs font-black uppercase text-campus-gold">No matches yet</p>
          <h2 className="mt-2 text-2xl font-black">Start with discovery.</h2>
          <p className="mt-2 text-campus-muted">When someone likes you back, they will appear here.</p>
          <Link className="btn-primary mt-4" to="/swipe">Go to swipe</Link>
        </div>
      )}
    </section>
  );
}
