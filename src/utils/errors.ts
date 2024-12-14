/**
 * Custom error class with HTTP status code
 */
export class CustomError extends Error {
	/**
	 * @param message - Error message
	 * @param statusCode - HTTP status code
	 */
	constructor(
	  message: string,
	  public statusCode: number
	) {
	  super(message);
	  this.name = 'CustomError';
	  Object.setPrototypeOf(this, CustomError.prototype);
	}
  }
