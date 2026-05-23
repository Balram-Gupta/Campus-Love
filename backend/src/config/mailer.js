  import nodemailer from "nodemailer";

  const mailTimeoutMs = Number(60000);
  const isProduction = process.env.NODE_ENV === "production";

  function envValue(name) {
    return process.env[name]?.trim();
  }

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
    const smtpHost = envValue("SMTP_HOST");
    const smtpPort = Number(envValue("SMTP_PORT") || 587);
    const smtpUser = envValue("SMTP_USER");
    const smtpPass = envValue("SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
  return null;
}

    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      connectionTimeout: mailTimeoutMs,
      greetingTimeout: mailTimeoutMs,
      socketTimeout: mailTimeoutMs,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
  }

  export async function sendMail({ to, subject, text }) {
  const transporter = createTransporter();

  console.log("HOST:", process.env.SMTP_HOST);
  console.log("PORT:", process.env.SMTP_PORT);
  console.log("USER:", process.env.SMTP_USER);
  console.log("PASS EXISTS:", !!process.env.SMTP_PASS);

  try {
    await transporter.verify();
    console.log("SMTP server connected");

    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text,
    });

    console.log("MAIL SENT:", info.messageId);

  } catch (err) {
    console.error("SMTP ERROR FULL:", err);
    throw err;
  }
}
