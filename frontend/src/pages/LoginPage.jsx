import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState("");

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: { email: form.get("email"), password: form.get("password") }
      });
      login(data.token, data.user);
      navigate(data.user.role === "admin" ? "/admin" : "/swipe");
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <main className="auth-page">
      <form className="panel max-w-md" onSubmit={submit}>
        <div className="section-title">
          <p>Login Page</p>
          <h1>Log in after approval</h1>
          <span>Users cannot swipe or chat until admin approves them.</span>
        </div>
        <label className="field">Email<input name="email" type="email" required /></label>
        <label className="field">Password<input name="password" type="password" required /></label>
        <div className="-mt-2 mb-4 text-right">
          <Link className="text-sm font-black text-campus-teal" to="/forgot-password">Forgot password?</Link>
        </div>
        {status && <p className="status-error">{status}</p>}
        <button className="btn-primary w-full" type="submit">Log in</button>
        <p className="mt-4 text-center text-sm text-campus-muted">
          New here? <Link className="font-black text-campus-teal" to="/signup">Sign up</Link>
        </p>
      </form>
    </main>
  );
}
