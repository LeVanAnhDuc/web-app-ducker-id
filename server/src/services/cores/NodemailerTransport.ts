// libs
import nodemailer from "nodemailer";
// types
import type { Transporter } from "nodemailer";
// common
import { ServiceUnavailableError } from "@/common/exceptions";
// others
import config from "@/constants/env";
import { Logger } from "@/libs/logger";

export interface EmailSendOptions {
  to: string;
  subject: string;
  htmlContent: string;
}

export abstract class EmailTransport {
  protected isInitialized: boolean = false;

  abstract sendRawEmail(options: EmailSendOptions): Promise<void>;
  abstract initialize(): Promise<void>;
  abstract cleanup(): Promise<void>;
  abstract get isConnected(): boolean;
}

const EMAIL_SERVICE_PROVIDER = "gmail";

const EMAIL_POOL = {
  MAX_CONNECTIONS: 5,
  MAX_MESSAGES_PER_CONNECTION: 100
} as const;

const EMAIL_RATE_LIMIT = {
  PER_SECOND: 5,
  DELTA_MS: 1000
} as const;

const EMAIL_TIMEOUT = {
  CONNECTION_MS: 10000,
  GREETING_MS: 10000,
  SOCKET_MS: 30000
} as const;

export class NodemailerTransport extends EmailTransport {
  private transporter: Transporter | null = null;

  constructor() {
    super();
    this.initialize();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.transporter = nodemailer.createTransport({
        service: EMAIL_SERVICE_PROVIDER,
        auth: {
          user: config.USERNAME_EMAIL,
          pass: config.PASSWORD_EMAIL
        },
        pool: true,
        maxConnections: EMAIL_POOL.MAX_CONNECTIONS,
        maxMessages: EMAIL_POOL.MAX_MESSAGES_PER_CONNECTION,
        rateDelta: EMAIL_RATE_LIMIT.DELTA_MS,
        rateLimit: EMAIL_RATE_LIMIT.PER_SECOND,
        connectionTimeout: EMAIL_TIMEOUT.CONNECTION_MS,
        greetingTimeout: EMAIL_TIMEOUT.GREETING_MS,
        socketTimeout: EMAIL_TIMEOUT.SOCKET_MS
      });

      this.isInitialized = true;
    } catch (error) {
      Logger.error("Failed to initialize email transport", error);
    }
  }

  async sendRawEmail(options: EmailSendOptions): Promise<void> {
    if (!this.transporter) {
      throw new ServiceUnavailableError({
        message: "Email transport not initialized"
      });
    }

    await this.transporter.sendMail({
      from: config.USERNAME_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.htmlContent
    });
  }

  async cleanup(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.isInitialized = false;
    }
  }

  get isConnected(): boolean {
    return this.transporter !== null && this.isInitialized;
  }
}
