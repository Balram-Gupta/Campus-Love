import dotenv from "dotenv";
import mongoose from "mongoose";
import Match from "../src/models/Match.js";
import User from "../src/models/User.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const defaultUsers = [
  {
    name: "Video Test One",
    email: "video.test.one@campuslove.test",
    password: "TestPassword123",
    age: 21,
    gender: "woman",
    department: "Computer Science",
    course: "B.Tech",
    semester: "5",
    rollNumber: "VIDTEST001",
    bio: "Approved test account for call QA.",
    interests: ["qa", "video calls"]
  },
  {
    name: "Video Test Two",
    email: "video.test.two@campuslove.test",
    password: "TestPassword123",
    age: 22,
    gender: "man",
    department: "Computer Science",
    course: "B.Tech",
    semester: "5",
    rollNumber: "VIDTEST002",
    bio: "Approved matched test account for call QA.",
    interests: ["qa", "chat"]
  }
];

async function upsertUser(seedUser) {
  const existing = await User.findOne({ email: seedUser.email });
  const userFields = {
    ...seedUser,
    profilePhoto: "admin",
    studentIdCard: "admin",
    role: "user",
    isVerified: true,
    verificationStatus: "approved"
  };

  if (existing) {
    Object.assign(existing, userFields);
    await existing.save();
    return existing;
  }

  return User.create(userFields);
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const users = await Promise.all(defaultUsers.map(upsertUser));
  const userIds = users.map((user) => user._id).sort();

  const match = await Match.findOneAndUpdate(
    { users: { $all: userIds, $size: 2 } },
    { users: userIds, lastMessageAt: new Date() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  console.log("Approved matched test users ready:");
  users.forEach((user) => {
    console.log(`- ${user.email} / TestPassword123`);
  });
  console.log(`Match ID: ${match._id}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
