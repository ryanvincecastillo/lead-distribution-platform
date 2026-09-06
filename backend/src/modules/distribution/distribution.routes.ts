import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { createDistributionSchema, setDistributionBrokersSchema } from './distribution.schema.js';
import { create, leads, setBrokers, show } from './distribution.controller.js';

export const distributionRoutes = Router();

distributionRoutes.use(requireAuth);

distributionRoutes.get('/', show);
distributionRoutes.post('/', validate({ body: createDistributionSchema }), create);
distributionRoutes.put('/brokers', validate({ body: setDistributionBrokersSchema }), setBrokers);
distributionRoutes.get('/leads', leads);
