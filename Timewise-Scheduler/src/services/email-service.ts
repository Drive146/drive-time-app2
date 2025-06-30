
'use server';

import nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: MailOptions): Promise<{ success: boolean; message: string }> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_EMAIL) {
    console.warn('SMTP environment variables not set. Email sending is disabled.');
    return { success: false, message: 'Configuration Error: Email sending is not configured on the server. This must be set in the deployment environment.' };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: parseInt(SMTP_PORT, 10) === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Drive by Talrop" <${SMTP_FROM_EMAIL}>`,
      to: to,
      subject: subject,
      html: html,
    });
    console.log(`Email sent successfully to ${to}`);
    return { success: true, message: 'Email sent successfully.' };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, message: `Failed to send email: ${error.message}` };
  }
}
