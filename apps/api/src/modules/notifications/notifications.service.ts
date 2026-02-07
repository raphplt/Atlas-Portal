import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface NotificationInput {
  to: string;
  subject: string;
  textBody: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly apiKey?: string;
  private readonly apiUrl: string;
  private readonly sandboxMode: boolean;
  private readonly sender?: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY');
    this.apiUrl =
      this.configService.get<string>('BREVO_API_URL') ??
      'https://api.brevo.com/v3/smtp/email';
    this.sandboxMode =
      this.configService.get<string>('BREVO_SANDBOX') === 'true';
    this.sender = this.configService.get<string>('EMAIL_SENDER');
  }

  async send(input: NotificationInput): Promise<void> {
    if (!this.apiKey || !this.sender) {
      this.logger.warn('Email provider not configured, notification skipped');
      return;
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': this.apiKey,
        ...(this.sandboxMode ? { 'x-sib-sandbox': 'drop' } : {}),
      },
      body: JSON.stringify({
        sender: { email: this.sender },
        to: [{ email: input.to }],
        subject: input.subject,
        textContent: input.textBody,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `Brevo send failed with status ${response.status}: ${body}`,
      );
    }
  }
}
