import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../src/models/User.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    throw new Error("Usage: npm run seed:admin -- admin@university.edu strongpassword");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    existing.role = "admin";
    existing.isVerified = true;
    existing.verificationStatus = "approved";
    existing.password = password;
    await existing.save({ validateBeforeSave: false });
  } else {
    await User.create({
      name: "Campus Admin",
      email,
      password,
      age: 30,
      gender: "prefer-not",
      department: "Administration",
      course: "Campus Safety",
      semester: "Staff",
      rollNumber: `ADMIN${Date.now()}`,
      profilePhoto: "admin",
      studentIdCard: "admin",
      role: "admin",
      isVerified: true,
      verificationStatus: "approved"
    });
  }

  console.log(`Admin ready: ${email}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
