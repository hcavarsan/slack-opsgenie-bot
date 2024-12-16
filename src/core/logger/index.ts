import debug from 'debug';
import { ILogger } from '@/core/interfaces';

export class Logger implements ILogger {
  private readonly debugger: debug.Debugger;

  constructor(namespace: string) {
    this.debugger = debug(`slash-command-template:${namespace}`);
  }

  debug(message: string, ...args: any[]): void {
    this.debugger(message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.debugger(`INFO: ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.debugger(`WARN: ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.debugger(`ERROR: ${message}`, ...args);
  }
}

export const createLogger = (namespace: string): ILogger => new Logger(namespace);
