import { Request, Response } from 'express';
import { RequestWithRawBody } from '../../middlewares/signatureVerification';

/**
 * Creates a mock Request object for testing
 * @param options - Partial RequestWithRawBody object to override default values
 * @returns RequestWithRawBody object with default values merged with provided options
 */
export const mockRequest = (options: Partial<RequestWithRawBody> = {}): RequestWithRawBody => {
  return {
    headers: {},
    rawBody: '',
    ...options
  } as RequestWithRawBody;
};

/**
 * Creates a mock Response object for testing
 * @returns Response object with mocked status, send and json methods
 */
export const mockResponse = (): Response => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return res as Response;
};

/**
 * Mock Next function for middleware testing
 */
export const mockNext = jest.fn();
