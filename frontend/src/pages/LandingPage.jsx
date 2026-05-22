import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-campus-paper text-campus-ink">
      <section className="grid min-h-screen items-center gap-8 px-6 py-10 lg:grid-cols-[1fr_0.8fr] lg:px-16">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase text-campus-gold">Verified university dating</p>
          <h1 className="mt-3 text-5xl font-black leading-tight md:text-7xl">CampusLove</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-campus-muted">
            A campus-only dating MVP with email OTP, student ID verification, admin approval, swipe matching,
            real-time chat, reporting, blocking, and notifications.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="btn-primary" to="/signup">Create account</Link>
            <Link className="btn-secondary" to="/upload-id">Upload ID</Link>
            <Link className="btn-secondary" to="/login">Log in</Link>
            <Link className="btn-secondary" to="/admin/login">Admin login</Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-campus-line bg-white shadow-soft">
          <img
            className="h-[520px] w-full object-cover"
            src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80"
            alt="University campus students"
          />
        </div>
      </section>
    </main>
  );
}
