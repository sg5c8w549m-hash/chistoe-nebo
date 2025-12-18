const nodemailer = require('nodemailer');

async function sendResetEmail(email, link) {
  if (!process.env.SMTP_HOST) {
    console.log(`[email mock] to ${email}: ${link}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@example.com',
    to: email,
    subject: 'Сброс пароля — Чистое Небо',
    html: `<p>Чтобы сбросить пароль нажмите:</p><a href="${link}">${link}</a>`
  });
}

async function sendResetSms(phone, tokenRaw) {
  console.log(`[sms mock] ${phone}: код сброса ${tokenRaw}`);
}

module.exports = { sendResetEmail, sendResetSms };
