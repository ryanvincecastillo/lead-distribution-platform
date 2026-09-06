import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { createFormSchema } from './form.schema.js';
import { create, show } from './form.controller.js';

export const formRoutes = Router();

formRoutes.use(requireAuth);

formRoutes.get('/', show);
formRoutes.post('/', validate({ body: createFormSchema }), create);
