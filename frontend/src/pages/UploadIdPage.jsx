import { Link } from "react-router-dom";

export default function UploadIdPage() {
  return (
    <main className="auth-page">
      <section className="panel max-w-2xl">
        <div className="section-title">
          <p>Upload ID Page</p>
          <h1>Student ID upload is part of signup</h1>
          <span>
            MDU CampusLove requires a student ID card image and profile photo during signup.
            the admin dashboard reviews the ID card and approves or rejects the account.
          </span>
        </div>
        <Link className="btn-primary" to="/signup">Go to signup</Link>
      </section>
    </main>
  );
}
