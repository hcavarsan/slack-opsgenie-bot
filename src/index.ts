import express, { Express, NextFunction } from 'express';
import * as functions from '@google-cloud/functions-framework';
import { handleSlashCommand } from '@/handlers/slack/slashCommand';
import { handleModalSubmission } from '@/handlers/slack/modalSubmission';
import { verifySlackSignature, rawBodyBuffer } from '@/middlewares/security/signatureVerification';
import { createLogger } from '@/core/logger';
import { env } from '@/config/environment';
import { RequestWithRawBody, TypedRequest, TypedResponse } from '@/types/express';

const logger = createLogger('app');
const app: Express = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ verify: rawBodyBuffer }));
app.use(express.raw({ type: 'application/json', verify: rawBodyBuffer }));

app.use((req: RequestWithRawBody, res: TypedResponse, next: NextFunction) => {
  if (!req.rawBody && req.body) {
    req.rawBody = JSON.stringify(req.body);
  }
  next();
});

app.use(verifySlackSignature);

app.post('/slack/commands', async (req: TypedRequest, res: TypedResponse) => {
  await handleSlashCommand(req, res);
});

app.post('/slack/interactivity', async (req: TypedRequest, res: TypedResponse) => {
  await handleModalSubmission(req, res);
});

app.get('/health', (_req: TypedRequest, res: TypedResponse) => {
  res.status(200).send('OK');
});

function initializeApp() {
  try {
    logger.info('Initializing application...');
    logger.info('Environment:', {
      nodeEnv: env.NODE_ENV,
      slackApiUrl: env.SLACK_API_URL,
      opsGenieTeamId: env.OPSGENIE_TEAM_ID
    });

    functions.http('app', app);
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

initializeApp();

export { app };
