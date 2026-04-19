import nodemailer from "nodemailer";

export class EmailDeliveryConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryConfigurationError";
  }
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT ?? 587);

  if (!host || !user || !pass) {
    const missing = [
      !host ? "SMTP_HOST" : null,
      !user ? "SMTP_USER" : null,
      !pass ? "SMTP_PASS" : null,
    ].filter(Boolean);

    throw new EmailDeliveryConfigurationError(
      `Email delivery is not configured. Missing: ${missing.join(", ")}.`,
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendVerificationEmail({
  to,
  name,
  verificationUrl,
}: {
  to: string;
  name?: string | null;
  verificationUrl: string;
}) {
  const transport = getTransport();

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: "Confirm your Royal Square account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 24px auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
        <h2 style="margin: 0 0 12px; color: #0f172a;">Welcome${name ? `, ${name}` : ""}!</h2>
        <p style="font-size: 15px; color: #374151; line-height: 1.6;">Click the button below to verify your email and activate your account.</p>
        <a href="${verificationUrl}" style="display: inline-block; margin-top: 12px; background: #81b64c; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 700;">Verify account</a>
        <p style="font-size: 12px; color: #6b7280; margin-top: 16px;">If you did not request this account, you can safely ignore this email.</p>
      </div>
    `,
  });
}
