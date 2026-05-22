import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api.js";

export default function SignupPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState(sessionStorage.getItem("campuslove_verified_email") || "");
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState(
    sessionStorage.getItem("campuslove_email_verification_token") || ""
  );

  async function requestOtp(event) {
    event.preventDefault();
    setStatus("");
    const form = new FormData(event.currentTarget);
    const nextEmail = String(form.get("email") || "").trim();
    try {
      const data = await api("/api/auth/request-registration-otp", {
        method: "POST",
        body: { email: nextEmail }
      });
      setEmail(nextEmail);
      setOtpSent(true);
      setStatus(data.message);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setStatus("");
    const form = new FormData(event.currentTarget);
    try {
      const data = await api("/api/auth/verify-registration-otp", {
        method: "POST",
        body: { email, otp: form.get("otp") }
      });
      setEmailVerificationToken(data.emailVerificationToken);
      sessionStorage.setItem("campuslove_verified_email", email);
      sessionStorage.setItem("campuslove_email_verification_token", data.emailVerificationToken);
      setStatus("");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("email", email);
    form.set("emailVerificationToken", emailVerificationToken);
    try {
      await api("/api/auth/register", { method: "POST", body: form, isForm: true });
      sessionStorage.removeItem("campuslove_verified_email");
      sessionStorage.removeItem("campuslove_email_verification_token");
      navigate("/pending");
    } catch (error) {
      setStatus(error.message);
    }
  }

  if (!emailVerificationToken) {
    return (
      <main className="auth-page">
        <div className="panel max-w-md">
          <div className="section-title">
            <p>Signup Page</p>
            <h1>Verify your email first</h1>
            <span>Registration opens after OTP verification.</span>
          </div>

          {!otpSent ? (
            <form onSubmit={requestOtp}>
              <Input name="email" label="Email" type="email" placeholder="name@example.com" defaultValue={email} required />
              {status && <p className="status-info">{status}</p>}
              <button className="btn-primary w-full" type="submit">Send OTP</button>
            </form>
          ) : (
            <form onSubmit={verifyOtp}>
              <label className="field">
                Email
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label className="field">OTP<input name="otp" inputMode="numeric" minLength="6" maxLength="6" required /></label>
              {status && <p className="status-info">{status}</p>}
              <button className="btn-primary w-full" type="submit">Verify OTP</button>
              <button className="btn-secondary mt-3 w-full" type="button" onClick={() => setOtpSent(false)}>Use another email</button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-campus-muted">
            Already registered? <Link className="font-black text-campus-teal" to="/login">Log in</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <form className="panel max-w-4xl" onSubmit={submit}>
        <div className="section-title">
          <p>Signup Page</p>
          <h1>Create your CampusLove profile</h1>
          <span>Your email is verified. Submit your profile for admin approval.</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input name="name" label="Name" required />
          <Input name="email" label="Email" type="email" value={email} readOnly required />
          <Input name="password" label="Password" type="password" minLength="8" required />
          <Input name="age" label="Age" type="number" min="19" required />
          <Select name="gender" label="Gender" options={["woman", "man", "non-binary", "prefer-not"]} />
          <Input name="department" label="Department" required />
          <Input name="course" label="Course" required />
          <Input name="semester" label="Year/Semester" required />
          <Input name="rollNumber" label="Roll Number" required />
          <Select name="genderPreference" label="Gender preference" options={["everyone", "women", "men", "non-binary"]} />
        </div>

        <label className="field">
          Bio
          <textarea name="bio" rows="4" maxLength="240" required />
        </label>
        <Input name="interests" label="Interests" placeholder="Music, coding, football" />
        <Input name="studentIdCard" label="Student ID Card Image" type="file" accept="image/*" required />
        <Input name="profilePhoto" label="Profile Photo" type="file" accept="image/*" required />

        {status && <p className="status-error">{status}</p>}
        <button className="btn-primary w-full" type="submit">Submit for approval</button>
        <p className="mt-4 text-center text-sm text-campus-muted">
          Already registered? <Link className="font-black text-campus-teal" to="/login">Log in</Link>
        </p>
      </form>
    </main>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="field">
      {label}
      <input {...props} />
    </label>
  );
}

function Select({ label, options, ...props }) {
  return (
    <label className="field">
      {label}
      <select {...props}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
