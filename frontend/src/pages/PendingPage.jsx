import { Link } from "react-router-dom";

export default function PendingPage() {
  return (
    <section className="page">
      <div className="panel max-w-2xl">
        <div className="section-title">
          <p>Pending Verification Page</p>
          <h1>Admin verification is pending</h1>
          <span>Your student ID card has to be approved before login, swipe, chat, voice call, and video call.</span>
        </div>
        <Link className="btn-secondary" to="/login">Back to login</Link>
      </div>
    </section>
  );
}
