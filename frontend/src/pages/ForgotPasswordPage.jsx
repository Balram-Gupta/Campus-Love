import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState("");

  async function requestOtp(event) {
    event.preventDefault();
    try {
      const data = await api("/api/auth/request-password-reset-otp", {
        method: "POST",
        body: { email }
      });
      setOtpSent(true);
      setStatus(data.message);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await api("/api/auth/reset-password", {
        method: "POST",
        body: {
          email,
          otp: form.get("otp"),
          newPassword: form.get("newPassword"),
          confirmPassword: form.get("confirmPassword")
        }
      });
      setStatus(data.message);
      event.currentTarget.reset();
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <main className="auth-page">
      <div className="panel w-full max-w-md">
        <div className="section-title">
          <p>Password Reset</p>
          <h1>Forgot password</h1>
          <span>Verify the OTP sent to your email, then choose a new password.</span>
        </div>

        {!otpSent ? (
          <form onSubmit={requestOtp}>
            <label className="field">Email<input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            {status && <p className="status-info mb-3">{status}</p>}
            <button className="btn-primary w-full" type="submit">Send OTP</button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <label className="field">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label className="field">OTP<input name="otp" inputMode="numeric" minLength="6" maxLength="6" required /></label>
            <label className="field">New password<input name="newPassword" type="password" minLength="8" required /></label>
            <label className="field">Confirm password<input name="confirmPassword" type="password" minLength="8" required /></label>
            {status && <p className="status-info mb-3">{status}</p>}
            <button className="btn-primary w-full" type="submit">Reset password</button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-campus-muted">
          Remembered it? <Link className="font-black text-campus-teal" to="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
