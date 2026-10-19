import nodemailer from 'nodemailer';

const env = process.env;

export const mailConfigured = () => Boolean((env.MAIL_SERVICE || env.MAIL_HOST) && env.MAIL_USER && env.MAIL_PASS && env.REPORT_EMAIL);

let transporter;

export function sendMail(message) {
  const port = Number(env.MAIL_PORT) || 587;
  transporter ??= nodemailer.createTransport({
    ...(env.MAIL_SERVICE ? { service: env.MAIL_SERVICE } : { host: env.MAIL_HOST, port, secure: port === 465 }),
    auth: { user: env.MAIL_USER, pass: env.MAIL_PASS },
    connectionTimeout: 10_000
  });
  return transporter.sendMail({
    from: { name: env.EMAIL_FROM_NAME || 'Besoia', address: env.EMAIL_FROM_ADDRESS || env.MAIL_USER },
    to: env.REPORT_EMAIL,
    ...message
  });
}
