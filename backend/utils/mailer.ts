import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmailNotification(payload: EmailPayload): Promise<void> {
  const client = getTransporter();
  if (!client) {
    // Graceful no-op when SMTP credentials are not configured in preview
    return;
  }
  try {
    await client.sendMail({
      from: process.env.SMTP_FROM || 'VanguardHire <notifications@vanguardhire.io>',
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    });
  } catch (err) {
    console.warn('[mailer] Email delivery skipped:', (err as Error).message);
  }
}
