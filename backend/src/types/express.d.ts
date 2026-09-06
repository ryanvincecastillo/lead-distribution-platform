declare global {
  namespace Express {
    interface Request {
      /** Correlation id, echoed back as the x-request-id response header. */
      id: string;
      /** Populated by requireAuth. */
      user?: { id: number; email: string };
    }
    interface Locals {
      /** Express 5 makes req.query read-only, so validated query lands here. */
      query?: unknown;
    }
  }
}

export {};
