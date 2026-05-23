import nodemailer from "nodemailer";

const mailTimeoutMs = Number(process.env.SMTP_TIMEOUT_MS || 8000);
const isProduction = process.env.NODE_ENV === "production";

async function withTimeout(promise, ms) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`Email send timed out after ${ms}ms`);
      error.code = "EMAIL_TIMEOUT";
      reject(error);
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createTransporter() {
  if (!process.env.SMTP_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    connectionTimeout: mailTimeoutMs,
    greetingTimeout: mailTimeoutMs,
    socketTimeout: mailTimeoutMs,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

export async function sendMail({ to, subject, text }) {
  const transporter = createTransporter();
  if (!transporter) {
    if (isProduction) {
      throw new Error("SMTP_HOST is not configured");
    }

    console.log(`[email skipped] ${subject} -> ${to}: ${text}`);
    return;
  }

  await withTimeout(
    transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text
    }),
    mailTimeoutMs
  );
}
