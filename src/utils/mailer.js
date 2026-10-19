import nodemailer from 'nodemailer';

export const mailConfigured = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.REPORT_EMAIL);

let transporter;

export function sendMail(message) {
  transporter ??= nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    connectionTimeout: 10_000
  });
  return transporter.sendMail({ from: `Besoia <${process.env.GMAIL_USER}>`, to: process.env.REPORT_EMAIL, ...message });
}
