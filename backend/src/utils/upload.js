import multer from "multer";
import { cloudinary } from "../config/cloudinary.js";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed"));
      return;
    }
    cb(null, true);
  }
});

export async function uploadImage(file, folder) {
  if (!file) {
    return "";
  }
  if (!file.mimetype.startsWith("image/")) {
    const error = new Error("Only image uploads are allowed");
    error.status = 400;
    throw error;
  }

  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return dataUri;
  }

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "image"
  });
  return result.secure_url;
}
