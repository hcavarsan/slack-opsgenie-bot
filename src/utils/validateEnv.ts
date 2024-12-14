/**
 * Validates required environment variables
 * @throws {Error} When required variables are missing or invalid
 */
export const validateEnv = () => {
  const required = [
    'SLACK_SIGNING_SECRET',
    'SLACK_BOT_TOKEN',
    'OPSGENIE_API_KEY',
    'OPSGENIE_TEAM_ID'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate OpsGenie API key format
  const opsGenieKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!opsGenieKeyPattern.test(process.env.OPSGENIE_API_KEY!)) {
    throw new Error('OPSGENIE_API_KEY must be a valid 36-character UUID');
  }

  // Validate Slack API URL
  if (!process.env.SLACK_API_URL) {
    process.env.SLACK_API_URL = 'https://slack.com/api';
  }

  // Ensure SLACK_API_URL ends with /api
  if (!process.env.SLACK_API_URL.endsWith('/api')) {
    process.env.SLACK_API_URL = process.env.SLACK_API_URL.replace(/\/?$/, '/api');
  }
};
