import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../utils/api.js";

export default function SignupPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/auth/register", { method: "POST", body: form, isForm: true });
      navigate("/pending");
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <main className="auth-page">
      <form className="panel max-w-4xl" onSubmit={submit}>
        <div className="section-title">
          <p>Signup Page</p>
          <h1>Create your MDU CampusLove profile</h1>
          <span>Submit your profile information for admin approval.</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input name="name" label="Name" required />
          <Input name="email" label="Email" type="email" placeholder="name@example.com" required />
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
