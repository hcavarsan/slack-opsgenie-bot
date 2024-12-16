import { Request, Response, NextFunction } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import timingSafeCompare from 'tsscmp';
import { createLogger } from '@/core/logger';
import { env } from '@/config/environment';
import { CustomError } from '@/core/errors/customError';

type BufferEncoding =
  | 'base64'
  | 'base64url'
  | 'hex'
  | 'binary'
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'utf-16le'
  | 'ucs2'
  | 'ucs-2'
  | 'latin1';

const logger = createLogger('signature-verification');

export interface RequestWithRawBody extends Request {
  rawBody?: string;
}

export const rawBodyBuffer = (
  req: IncomingMessage,
  res: ServerResponse,
  buf: Buffer,
  encoding: string
): void => {
  if (buf && buf.length) {
    (req as RequestWithRawBody).rawBody = buf.toString(encoding as BufferEncoding);
  }
};

export const verifySlackSignature = (
  req: RequestWithRawBody,
  res: Response,
  next: NextFunction
): void => {
  try {
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;

    if (!signature || !timestamp) {
      if (env.NODE_ENV === 'development') {
        return next();
      }
      throw new CustomError('Missing required headers', 401);
    }

    if (isTimestampTooOld(timestamp)) {
      throw new CustomError('Request timestamp too old', 401);
    }

    if (!req.rawBody) {
      throw new CustomError('Missing request body', 400);
    }

    verifySignature(signature, timestamp, req.rawBody);
    next();
  } catch (error) {
    handleVerificationError(error, res);
  }
};

function isTimestampTooOld(timestamp: string): boolean {
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
  return parseInt(timestamp) < fiveMinutesAgo;
}

function verifySignature(signature: string, timestamp: string, rawBody: string): void {
  const [version, hash] = signature.split('=');
  const hmac = crypto.createHmac('sha256', env.SLACK_SIGNING_SECRET);
  hmac.update(`${version}:${timestamp}:${rawBody}`);

  if (!timingSafeCompare(hmac.digest('hex'), hash)) {
    throw new CustomError('Invalid signature', 401);
  }
}

function handleVerificationError(error: any, res: Response): void {
  logger.error('Signature verification error:', error);

  if (error instanceof CustomError) {
    res.status(error.statusCode).json({ error: error.message });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}
