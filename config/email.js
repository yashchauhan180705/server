const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // Validate email configuration
  if (!config.auth.user || !config.auth.pass) {
    console.error('❌ EMAIL CONFIG ERROR: SMTP_USER or SMTP_PASS is missing in .env file');
  }

  return nodemailer.createTransport(config);
};

// Send OTP email
const sendOTPEmail = async (email, otp, purpose) => {
  const transporter = createTransporter();

  const purposeText = {
    register: 'complete your registration',
    login: 'login to your account',
    'reset-password': 'reset your password',
  };

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"News Portal" <noreply@newsportal.com>',
    to: email,
    subject: `Your OTP for News Portal - ${otp}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; }
          .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>News Portal</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You requested an OTP to <strong>${purposeText[purpose]}</strong>.</p>
            <div class="otp-box">
              <p style="margin: 0; color: #666;">Your One-Time Password</p>
              <p class="otp-code">${otp}</p>
            </div>
            <p><strong>This OTP will expire in 5 minutes.</strong></p>
            <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} News Portal. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    console.log(`📧 Attempting to send OTP email to: ${email}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}. Message ID: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Email sending error:', {
      code: error.code,
      message: error.message,
      response: error.response,
      command: error.command,
      to: email,
    });
    return { success: false, error: error.message };
  }
};

module.exports = { sendOTPEmail };
