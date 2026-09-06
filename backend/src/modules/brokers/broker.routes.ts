import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { brokerIdSchema, createBrokerSchema, updateBrokerSchema } from './broker.schema.js';
import { create, destroy, index, leads, show, update } from './broker.controller.js';

export const brokerRoutes = Router();

brokerRoutes.use(requireAuth);

brokerRoutes.get('/', index);
brokerRoutes.post('/', validate({ body: createBrokerSchema }), create);
brokerRoutes.get('/:id', validate({ params: brokerIdSchema }), show);
brokerRoutes.get('/:id/leads', validate({ params: brokerIdSchema }), leads);
brokerRoutes.patch('/:id', validate({ params: brokerIdSchema, body: updateBrokerSchema }), update);
brokerRoutes.delete('/:id', validate({ params: brokerIdSchema }), destroy);
