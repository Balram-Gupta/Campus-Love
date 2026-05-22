import mongoose from "mongoose";

const placeholderHosts = new Set(["cluster.example.net"]);
const placeholderTokens = ["<cluster-host>", "YOUR_CLUSTER_HOST"];

export async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is required");
  }

  if (placeholderTokens.some((token) => uri.includes(token))) {
    throw new Error(
      "MONGO_URI still contains a placeholder host. Replace <cluster-host> with your real MongoDB Atlas host, for example cluster0.xxxxx.mongodb.net."
    );
  }

  let parsedUri;
  try {
    parsedUri = new URL(uri);
  } catch {
    throw new Error(
      "MONGO_URI must be a valid MongoDB connection string. Use mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/campuslove?retryWrites=true&w=majority"
    );
  }

  if (placeholderHosts.has(parsedUri.hostname)) {
    throw new Error(
      "MONGO_URI still uses the sample host cluster.example.net. Replace it in backend/.env with your MongoDB Atlas connection string or a local MongoDB URI."
    );
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}
