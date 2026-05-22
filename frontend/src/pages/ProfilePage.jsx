import { useEffect, useState } from "react";
import { api, imageUrl } from "../utils/api.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function ProfilePage() {
  const { token, user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  useEffect(() => {
    api("/api/users/me", { token }).then((data) => setProfile(data.user)).catch((error) => setStatus(error.message));
  }, [token]);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await api("/api/users/profile", { method: "PUT", token, body: form, isForm: true });
      setProfile(data.user);
      updateUser(data.user);
      setSelectedPhotos([]);
      setStatus("Profile saved");
    } catch (error) {
      setStatus(error.message);
    }
  }

  function toggleSelectedPhoto(photo) {
    setSelectedPhotos((current) => current.includes(photo) ? current.filter((item) => item !== photo) : [...current, photo]);
  }

  async function deleteSelectedPhotos() {
    try {
      const data = await api("/api/users/photos", { method: "DELETE", token, body: { photos: selectedPhotos } });
      setProfile(data.user);
      updateUser(data.user);
      setSelectedPhotos([]);
      setStatus("Selected photos deleted");
    } catch (error) {
      setStatus(error.message);
    }
  }

  if (!profile) {
    return <section className="page"><p className="text-campus-muted">Loading profile...</p></section>;
  }

  return (
    <section className="page">
      <div className="section-title">
        <p>Profile Setup Page</p>
        <h1>Your profile</h1>
        <span>Keep details friendly, simple, and safe for campus discovery.</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <article className="panel">
          <img className="h-80 w-full rounded-lg object-cover" src={imageUrl(profile.profilePhoto)} alt={profile.name} />
          <h2 className="mt-4 text-2xl font-black">{profile.name}</h2>
          <p className="text-campus-muted">{profile.department} | {profile.course} | {profile.semester}</p>
          <p className="text-sm text-campus-muted">Role: {user?.role}</p>
        </article>
        <form className="panel" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field">Name<input name="name" defaultValue={profile.name} required /></label>
            <label className="field">Age<input name="age" type="number" min="19" defaultValue={profile.age} required /></label>
            <label className="field">Department<input name="department" defaultValue={profile.department} required /></label>
            <label className="field">Course<input name="course" defaultValue={profile.course} required /></label>
            <label className="field">Year/Semester<input name="semester" defaultValue={profile.semester} required /></label>
            <label className="field">
              Gender preference
              <select name="genderPreference" defaultValue={profile.genderPreference}>
                <option value="everyone">everyone</option>
                <option value="women">women</option>
                <option value="men">men</option>
                <option value="non-binary">non-binary</option>
              </select>
            </label>
          </div>
          <label className="field">Bio<textarea name="bio" rows="4" defaultValue={profile.bio} /></label>
          <label className="field">Interests<input name="interests" defaultValue={(profile.interests || []).join(", ")} /></label>
          <label className="field">Change profile picture<input name="profilePhoto" type="file" accept="image/*" /></label>
          <label className="field">Add photos<input name="photos" type="file" accept="image/*" multiple /></label>
          {status && <p className="status-info">{status}</p>}
          <button className="btn-primary" type="submit">Save profile</button>
        </form>
      </div>
      <section className="mt-5 panel">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-campus-gold">Uploaded pictures</p>
            <h2 className="text-2xl font-black">Your photo gallery</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-campus-muted">{(profile.photos || []).length} photos</span>
            <button className="btn-secondary" type="button" disabled={!selectedPhotos.length} onClick={deleteSelectedPhotos}>
              Delete selected
            </button>
          </div>
        </div>
        {(profile.photos || []).length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {profile.photos.map((photo) => (
              <div key={photo} className="overflow-hidden rounded-lg border border-campus-line bg-campus-paper">
                <label className="flex cursor-pointer items-center gap-2 border-b border-campus-line bg-white p-3 text-sm font-black text-campus-ink">
                  <input
                    className="h-4 w-4"
                    type="checkbox"
                    checked={selectedPhotos.includes(photo)}
                    onChange={() => toggleSelectedPhoto(photo)}
                  />
                  Select
                </label>
                <a href={imageUrl(photo)} target="_blank" rel="noreferrer" className="block">
                  <img className="h-56 w-full object-cover" src={imageUrl(photo)} alt="Uploaded profile" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-campus-muted">No extra pictures uploaded yet.</p>
        )}
      </section>
    </section>
  );
}
