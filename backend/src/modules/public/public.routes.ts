import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { publicLeadLimiter } from '../../middleware/rate-limit.js';
import { formSlugParamSchema } from '../forms/form.schema.js';
import { showPublic } from '../forms/form.controller.js';
import { publicLeadSchema } from '../leads/lead.schema.js';
import { submit } from '../leads/lead.controller.js';

/** Deliberately unauthenticated: these are the visitor-facing endpoints. */
export const publicRoutes = Router();

publicRoutes.get('/forms/:slug', validate({ params: formSlugParamSchema }), showPublic);
publicRoutes.post(
  '/forms/:slug/leads',
  publicLeadLimiter,
  validate({ params: formSlugParamSchema, body: publicLeadSchema }),
  submit,
);
