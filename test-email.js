require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = async () => {
  console.log('🧪 Testing Email Configuration...\n');

  // Check if env variables are set
  console.log('📋 Checking environment variables:');
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || '❌ NOT SET'}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || '❌ NOT SET'}`);
  console.log(`   SMTP_USER: ${process.env.SMTP_USER ? '✅ SET (hidden for security)' : '❌ NOT SET'}`);
  console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '✅ SET (hidden for security)' : '❌ NOT SET'}`);
  console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || '❌ NOT SET'}\n`);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP credentials are missing. Please check your .env file.');
    process.exit(1);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Test connection
  console.log('🔗 Testing SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');
  } catch (error) {
    console.error('❌ SMTP connection failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    if (error.code === 'EAUTH') {
      console.error('   → Invalid email or app password. Please verify your credentials.');
      console.error('   → For Gmail: Use an App Password (not your regular password)');
      console.error('   → Generate one here: https://myaccount.google.com/apppasswords');
    }
    process.exit(1);
  }

  // Send test email
  console.log('📧 Sending test email...');
  const testOTP = Math.floor(100000 + Math.random() * 900000).toString();

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"News Portal" <noreply@newsportal.com>',
    to: process.env.SMTP_USER, // Send to self
    subject: `Test OTP - ${testOTP}`,
    html: `
      <h2>Test Email</h2>
      <p>If you received this email, your SMTP configuration is working correctly!</p>
      <p><strong>Test OTP: ${testOTP}</strong></p>
      <p>This is a test message from your News Portal application.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('\n🎉 Your email configuration is working properly!');
    console.log(`   Check ${process.env.SMTP_USER} for the test email.`);
  } catch (error) {
    console.error('❌ Failed to send test email:');
    console.error('   Error:', error.message);
    if (error.code === 'ESOCKET') {
      console.error('   → Network error. Check your internet connection.');
    }
    process.exit(1);
  }
};

testEmail();
