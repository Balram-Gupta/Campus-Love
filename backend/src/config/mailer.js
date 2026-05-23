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

    if (!smtpHost) {
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
    if (!transporter) {
      if (isProduction) {
        throw new Error("SMTP_HOST is not configured");
      }

      console.log(`[email skipped] ${subject} -> ${to}: ${text}`);
      return;
    }

    await withTimeout(
      transporter.sendMail({
        from: envValue("MAIL_FROM") || envValue("SMTP_USER"),
        to,
        subject,
        text
      }),
      mailTimeoutMs
    );
  }
