const { Resend } = require('resend');

class Mailer {
  constructor() {
    this.resend = null;
    this.isDummy = true;
    this.init();
  }

  init() {
    try {
      if (process.env.RESEND_API_KEY) {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        this.isDummy = false;
        console.log('✅ Resend Mailer initialized securely via RESEND_API_KEY.');
      } else {
        console.log('⚠️ Resend Mailer API Key is not set in environment. (Dummy Mailer mode enabled - no real emails will be delivered).');
      }
    } catch (err) {
      console.error('Failed to init Resend mailer:', err);
    }
  }

  async sendMail(mailOptions) {
    console.log(`[MAILER] Starting email send process using Resend to: ${mailOptions.to}`);
    
    if (this.isDummy) {
      console.log(`[MAILER] [DUMMY MODE] Would send email to: ${mailOptions.to}. Subject: ${mailOptions.subject}`);
      return { messageId: 'dummy_msg_id_' + Date.now() };
    }

    try {
      const response = await this.resend.emails.send({
        from: 'CampusBID <onboarding@resend.dev>',
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html
      });

      if (response.error) {
        throw new Error(response.error.message || 'Resend API returned an error');
      }

      console.log(`[MAILER] Email successfully sent using Resend to: ${mailOptions.to}. Message ID: ${response.data.id}`);
      return { messageId: response.data.id };
    } catch (error) {
      console.error(`[MAILER] Resend email send failed to: ${mailOptions.to}. Error:`, error);
      throw error;
    }
  }
}

module.exports = new Mailer();
