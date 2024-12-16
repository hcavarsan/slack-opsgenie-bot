import { Request, Response } from 'express';
import { ParamsDictionary as ExpressParams } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

export interface RequestWithRawBody extends Request {
  rawBody?: string;
}

export type TypedRequest<T = any> = Request<ExpressParams, any, T, ParsedQs>;
export type TypedResponse<T = any> = Response<T>;

export type SlackRequest = TypedRequest & RequestWithRawBody;
