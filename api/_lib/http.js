export class HttpError extends Error {
  /**
   * @param {number} status HTTP status sent to the browser
   * @param {string} message Safe, human-readable message
   * @param {number} [upstream] Status Softr returned, when the error came from Softr
   */
  constructor(status, message, upstream, code) {
    super(message);
    this.status = status;
    this.upstream = upstream;
    this.code = code;
  }
}

/**
 * Wraps a set of method handlers. A handler that returns a value gets it sent
 * as JSON; a handler that writes the response itself returns undefined.
 */
export function route(methods) {
  return async function handler(req, res) {
    const fn = methods[req.method];
    if (!fn) {
      res.setHeader('Allow', Object.keys(methods).join(', '));
      res.status(405).json({ message: 'Method not allowed.' });
      return;
    }
    try {
      const result = await fn(req, res);
      if (result !== undefined && !res.headersSent) {
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json(result);
      }
    } catch (error) {
      const known = error instanceof HttpError;
      if (!known || error.status >= 500) console.error(error);
      if (res.headersSent) return;
      res.status(known ? error.status : 500).json({
        message: known ? error.message : 'Something went wrong on the server.',
        ...(known && error.code ? { code: error.code } : {}),
      });
    }
  };
}

export function readBody(req) {
  const value = req.body;
  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) return value;
  if (typeof value === 'string' && value) {
    try {
      return JSON.parse(value);
    } catch {
      throw new HttpError(400, 'Invalid JSON body.');
    }
  }
  return {};
}
