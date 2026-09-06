import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { assignLeadSchema, leadIdSchema, leadQuerySchema } from './lead.schema.js';
import { assign, index, show, stats } from './lead.controller.js';

export const leadRoutes = Router();

leadRoutes.use(requireAuth);

leadRoutes.get('/', validate({ query: leadQuerySchema }), index);
leadRoutes.get('/stats', stats);
leadRoutes.get('/:id', validate({ params: leadIdSchema }), show);
leadRoutes.post('/:id/assign', validate({ params: leadIdSchema, body: assignLeadSchema }), assign);
