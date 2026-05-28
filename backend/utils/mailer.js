const nodemailer = require('nodemailer');

class Mailer {
  constructor() {
    this.transporter = null;
    this.isDummy = true;
    this.init();
  }

  async init() {
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          // Use Real SMTP Details if provided in .env
          this.transporter = nodemailer.createTransport({
            service: 'gmail', // Standardizing on Gmail for ease
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            }
          });
          this.isDummy = false;
          console.log('✅ Real SMTP Mailer initialized securely via .env credentials.');
      } else {
          // Fallback to Test
          const account = await nodemailer.createTestAccount();
          this.transporter = nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: {
              user: account.user,
              pass: account.pass
            }
          });
          console.log('⚠️ Dummy Mailer initialized. (No real emails will be delivered. Add EMAIL_USER and EMAIL_PASS to .env to enable real delivery).');
      }
    } catch (err) {
      console.error('Failed to init mailer:', err);
    }
  }

  async sendMail(mailOptions) {
    if (!this.transporter) {
      console.log('[MAILER NOT READY]', mailOptions);
      return;
    }
    
    const sender = this.isDummy ? '"CampusBID Dummy" <noreply@campusbid.com>' : `"CampusBID" <${process.env.EMAIL_USER}>`;
    
    const info = await this.transporter.sendMail({
       from: sender,
       ...mailOptions
    });
    
    if (this.isDummy) {
        console.log("Preview Dummy Email URL: %s", nodemailer.getTestMessageUrl(info));
    }
    return info;
  }
}

module.exports = new Mailer();
