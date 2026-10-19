import nodemailer from 'nodemailer';

const env = process.env;

const useBrevo = () => Boolean(env.BREVO_API_KEY);

export const mailConfigured = () => Boolean(env.REPORT_EMAIL && (useBrevo()
  ? env.EMAIL_FROM_ADDRESS
  : (env.MAIL_SERVICE || env.MAIL_HOST) && env.MAIL_USER && env.MAIL_PASS));

const sender = () => ({ name: env.EMAIL_FROM_NAME || 'Besoia', address: env.EMAIL_FROM_ADDRESS || env.MAIL_USER });
const recipients = () => env.REPORT_EMAIL.split(',').map((email) => email.trim()).filter(Boolean);

// Render's free plan blocks SMTP ports, Brevo's HTTP API goes over 443
async function sendWithBrevo({ subject, text, attachments = [] }) {
  const { name, address } = sender();
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name, email: address },
      to: recipients().map((email) => ({ email })),
      subject,
      textContent: text,
      attachment: attachments.length ? attachments.map((file) => ({ name: file.filename, content: Buffer.from(file.content).toString('base64') })) : undefined
    }),
    signal: AbortSignal.timeout(15_000)
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Brevo ${response.status}: ${body}`);
  console.log('Report email accepted by Brevo:', body);
}

let transporter;

function sendWithSmtp(message) {
  const port = Number(env.MAIL_PORT) || 587;
  transporter ??= nodemailer.createTransport({
    ...(env.MAIL_SERVICE ? { service: env.MAIL_SERVICE } : { host: env.MAIL_HOST, port, secure: port === 465 }),
    auth: { user: env.MAIL_USER, pass: env.MAIL_PASS },
    connectionTimeout: 10_000
  });
  return transporter.sendMail({ from: sender(), to: recipients(), ...message });
}

export const sendMail = (message) => (useBrevo() ? sendWithBrevo(message) : sendWithSmtp(message));
