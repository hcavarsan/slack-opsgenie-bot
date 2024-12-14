import express, { Request, Response, NextFunction } from 'express';
import * as functions from '@google-cloud/functions-framework';
import { handleSlashCommand } from './handlers/slashCommandHandler';
import { handleModalSubmission } from './handlers/modalSubmissionHandler';
import { verifySlackSignature, rawBodyBuffer, RequestWithRawBody } from './middlewares/signatureVerification';
import debug from 'debug';

const logger = debug('slash-command-template:startup');

// Create Express app
const app = express();

// Configure middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));  // For raw body parsing

// Add rawBody to the request object
app.use((req: RequestWithRawBody, res: Response, next: NextFunction) => {
  if (req.rawBody === undefined && req.body) {
    req.rawBody = JSON.stringify(req.body);
  }
  next();
});

app.use(verifySlackSignature);

// Routes
app.post('/slack/commands', handleSlashCommand);
app.post('/slack/interactivity', handleModalSubmission);

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.send('OK');
});

// Register with Functions Framework
functions.http('app', app);

// Add this at the start of your app initialization
logger('Environment variables:');
logger('SLACK_API_URL:', process.env.SLACK_API_URL);
logger('OPSGENIE_API_KEY length:', process.env.OPSGENIE_API_KEY?.length);
logger('OPSGENIE_API_KEY first/last 4 chars:',
  process.env.OPSGENIE_API_KEY ?
  `${process.env.OPSGENIE_API_KEY.slice(0,4)}...${process.env.OPSGENIE_API_KEY.slice(-4)}` :
  'not set'
);
logger('OPSGENIE_TEAM_ID:', process.env.OPSGENIE_TEAM_ID);
logger('NODE_ENV:', process.env.NODE_ENV);

export { app };
