import { Router } from 'express';
import { authRoutes } from './modules/auth/auth.routes.js';
import { brokerRoutes } from './modules/brokers/broker.routes.js';
import { formRoutes } from './modules/forms/form.routes.js';
import { distributionRoutes } from './modules/distribution/distribution.routes.js';
import { leadRoutes } from './modules/leads/lead.routes.js';
import { publicRoutes } from './modules/public/public.routes.js';

export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/public', publicRoutes);
apiRoutes.use('/brokers', brokerRoutes);
apiRoutes.use('/form', formRoutes);
apiRoutes.use('/distribution', distributionRoutes);
apiRoutes.use('/leads', leadRoutes);
