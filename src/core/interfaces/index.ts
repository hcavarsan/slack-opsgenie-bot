export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface IService {
  initialize(): Promise<void>;
}

export interface IRequestHandler {
  handle(request: any): Promise<any>;
}

export interface IMiddleware {
  handle(request: unknown, response: unknown, next: () => void): Promise<void>;
}
