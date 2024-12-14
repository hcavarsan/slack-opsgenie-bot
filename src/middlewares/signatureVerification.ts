import { Request, Response, NextFunction } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import timingSafeCompare from 'tsscmp';
import { CustomError } from '../utils/errors';

export interface RequestWithRawBody extends Request {
  rawBody?: string;
}

/**
 * Middleware to capture raw request body
 * @param req - HTTP request object
 * @param res - HTTP response object
 * @param buf - Raw request buffer
 * @param encoding - Buffer encoding
 */
export const rawBodyBuffer = (
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage>,
  buf: Buffer,
  encoding: string
): void => {
  if (buf && buf.length > 0) {
    (req as RequestWithRawBody).rawBody = buf.toString(encoding as BufferEncoding);
  } else {
    delete (req as RequestWithRawBody).rawBody;
  }
};

/**
 * Middleware to verify Slack request signatures
 * @param req - Express request object with raw body
 * @param res - Express response object
 * @param next - Express next function
 * @throws {CustomError} When signature verification fails
 */
export const verifySlackSignature = (req: RequestWithRawBody, res: Response, next: NextFunction): void => {
  try {
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;

    console.log('Verifying Slack signature:');
    console.log('- Signature:', signature);
    console.log('- Timestamp:', timestamp);
    console.log('- Raw Body:', req.rawBody);
    console.log('- Signing Secret:', process.env.SLACK_SIGNING_SECRET ? 'Present' : 'Missing');

    if (!signature || !timestamp) {
      console.log('Missing headers - allowing request in development');
      if (process.env.NODE_ENV === 'development') {
        return next();
      }
      throw new CustomError('Missing required headers', 401);
    }

    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (60 * 5);
    if (parseInt(timestamp) < fiveMinutesAgo) {
      throw new CustomError('Request timestamp too old', 401);
    }

    if (!req.rawBody) {
      throw new CustomError('Missing request body', 400);
    }

    const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET || '');
    const [version, hash] = signature.split('=');

    hmac.update(`${version}:${timestamp}:${req.rawBody}`);

    if (!timingSafeCompare(hmac.digest('hex'), hash)) {
      throw new CustomError('Invalid signature', 401);
    }

    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
