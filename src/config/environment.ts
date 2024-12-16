export class Environment {
  private static instance: Environment;
  private readonly requiredVars = [
    'SLACK_SIGNING_SECRET',
    'SLACK_BOT_TOKEN',
    'OPSGENIE_API_KEY',
    'OPSGENIE_TEAM_ID'
  ];

  private constructor() {
    this.validateEnvironment();
  }

  public static getInstance(): Environment {
    if (!Environment.instance) {
      Environment.instance = new Environment();
    }
    return Environment.instance;
  }

  public get SLACK_API_URL(): string {
    return process.env.SLACK_API_URL || 'https://slack.com/api';
  }

  public get SLACK_BOT_TOKEN(): string {
    return process.env.SLACK_BOT_TOKEN!;
  }

  public get SLACK_SIGNING_SECRET(): string {
    return process.env.SLACK_SIGNING_SECRET!;
  }

  public get OPSGENIE_API_KEY(): string {
    return process.env.OPSGENIE_API_KEY!;
  }

  public get OPSGENIE_TEAM_ID(): string {
    return process.env.OPSGENIE_TEAM_ID!;
  }

  public get OPSGENIE_DOMAIN(): string {
    return process.env.OPSGENIE_DOMAIN || 'app';
  }

  public get NODE_ENV(): string {
    return process.env.NODE_ENV || 'development';
  }

  private validateEnvironment(): void {
    const missing = this.requiredVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    this.validateOpsGenieApiKey();
    this.normalizeSlackApiUrl();
  }

  private validateOpsGenieApiKey(): void {
    const opsGenieKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!opsGenieKeyPattern.test(process.env.OPSGENIE_API_KEY!)) {
      throw new Error('OPSGENIE_API_KEY must be a valid 36-character UUID');
    }
  }

  private normalizeSlackApiUrl(): void {
    if (!process.env.SLACK_API_URL) {
      process.env.SLACK_API_URL = 'https://slack.com/api';
    }
    if (!process.env.SLACK_API_URL.endsWith('/api')) {
      process.env.SLACK_API_URL = process.env.SLACK_API_URL.replace(/\/?$/, '/api');
    }
  }
}

export const env = Environment.getInstance();
