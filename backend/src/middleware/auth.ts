import { Request, Response, NextFunction } from 'express';
import basicAuth from 'express-basic-auth';

export function createAuthMiddleware() {
  const user = process.env.AUTH_USER ?? 'root';
  const password = process.env.AUTH_PASSWORD ?? 'root';

  return basicAuth({
    users: { [user]: password },
    challenge: true,
    realm: 'IVF Dashboard',
  });
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
}
