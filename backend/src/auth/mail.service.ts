import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly frontendUrl: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  }

  async sendConfirmationEmail(email: string, token: string): Promise<void> {
    const confirmUrl = `${this.frontendUrl}/confirm?token=${token}`;

    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY not set — confirmation link for ${email}: ${confirmUrl}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Authentikka <onboarding@resend.dev>',
      to: email,
      subject: 'Confirm your Authentikka account',
      html: `
        <p>Welcome to Authentikka.</p>
        <p>Click the link below to confirm your email address and activate your account:</p>
        <p><a href="${confirmUrl}">${confirmUrl}</a></p>
        <p>If you didn't create this account, you can ignore this email.</p>
      `,
    });

    if (error) {
      this.logger.error(`Resend failed to send confirmation email to ${email}: ${error.message}`);
      this.logger.warn(`Confirmation link for ${email}: ${confirmUrl}`);
    }
  }

  async sendNotificationEmail(email: string, subject: string, message: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY not set — notification for ${email}: ${subject} — ${message}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'Authentikka <onboarding@resend.dev>',
      to: email,
      subject,
      html: `<p>${message}</p>`,
    });

    if (error) {
      this.logger.error(`Resend failed to send notification email to ${email}: ${error.message}`);
      this.logger.warn(`Notification for ${email}: ${subject} — ${message}`);
    }
  }
}
