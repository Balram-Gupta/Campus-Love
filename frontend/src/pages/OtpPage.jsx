import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../utils/api.js";

export default function OtpPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await api("/api/auth/verify-registration-otp", {
        method: "POST",
        body: { email: form.get("email"), otp: form.get("otp") }
      });
      sessionStorage.setItem("campuslove_verified_email", form.get("email"));
      sessionStorage.setItem("campuslove_email_verification_token", data.emailVerificationToken);
      setStatus(data.message);
      navigate("/signup", { replace: true });
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <main className="auth-page">
      <form className="panel max-w-md" onSubmit={submit}>
        <div className="section-title">
          <p>Email OTP</p>
          <h1>Verify your email</h1>
          <span>Registration must be completed after email verification.</span>
        </div>
        <label className="field">Email<input name="email" type="email" defaultValue={params.get("email") || ""} required /></label>
        <label className="field">OTP<input name="otp" inputMode="numeric" minLength="6" maxLength="6" required /></label>
        {status && <p className="status-info">{status}</p>}
        <button className="btn-primary w-full" type="submit">Verify OTP</button>
        <Link className="btn-secondary mt-3 w-full text-center" to="/signup">Back to signup</Link>
      </form>
    </main>
  );
}
