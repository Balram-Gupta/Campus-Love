import nodemailer from "nodemailer";

function envValue(name) {
  return process.env[name]?.trim();
}

function mailTimeoutMs() {
  return Number(envValue("MAIL_TIMEOUT_MS") || 8000);
}

function mailFrom() {
  return envValue("MAIL_FROM") || envValue("MAILJET_FROM_EMAIL") || envValue("SMTP_USER");
}

export function createTransporter() {
  const mailjetUser = envValue("MAILJET_API_KEY");
  const mailjetPass = envValue("MAILJET_SECRET_KEY") || envValue("MAILJET_API_SECRET");
  const smtpHost = envValue("SMTP_HOST") || (mailjetUser && mailjetPass ? "in-v3.mailjet.com" : "");
  const smtpPort = Number(envValue("SMTP_PORT") || 587);
  const smtpUser = envValue("SMTP_USER") || mailjetUser;
  const smtpPass = envValue("SMTP_PASS") || mailjetPass;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    connectionTimeout: mailTimeoutMs(),
    greetingTimeout: mailTimeoutMs(),
    socketTimeout: mailTimeoutMs(),
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
}

async function sendWithSmtp({ to, subject, text }) {
  const transporter = createTransporter();

  if (!transporter) {
    return false;
  }

  const from = mailFrom();
  if (!from) {
    const error = new Error("MAIL_FROM is required when email is configured");
    error.code = "EMAIL_FROM_MISSING";
    throw error;
  }

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text
  });

  console.log("MAIL SENT:", info.messageId);
  return true;
}

export async function sendMail({ to, subject, text }) {
  if (await sendWithSmtp({ to, subject, text })) {
    return;
  }

  throw new Error("Email is not configured. Set MAILJET_API_KEY, MAILJET_SECRET_KEY, and MAIL_FROM.");
}
