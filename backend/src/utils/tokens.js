import jwt from "jsonwebtoken";

export function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, isVerified: user.isVerified },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function signEmailVerificationToken(email) {
  return jwt.sign(
    { email: String(email).toLowerCase(), purpose: "registration-email-verified" },
    process.env.JWT_SECRET,
    { expiresIn: "20m" }
  );
}

export function verifyEmailVerificationToken(token, email) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  return (
    payload.purpose === "registration-email-verified" &&
    payload.email === String(email).toLowerCase()
  );
}

export function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
