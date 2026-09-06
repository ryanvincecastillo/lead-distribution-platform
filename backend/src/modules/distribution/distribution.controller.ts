import type { RequestHandler } from 'express';
import { ok } from '../../lib/http.js';
import {
  createDistribution,
  getDistribution,
  getDistributionLeads,
  setDistributionBrokers,
} from './distribution.service.js';
import type { CreateDistributionInput, SetDistributionBrokersInput } from './distribution.schema.js';

export const show: RequestHandler = async (_req, res) => {
  res.json(ok(await getDistribution()));
};

export const create: RequestHandler = async (req, res) => {
  res.status(201).json(ok(await createDistribution(req.body as CreateDistributionInput)));
};

export const setBrokers: RequestHandler = async (req, res) => {
  res.json(ok(await setDistributionBrokers(req.body as SetDistributionBrokersInput)));
};

export const leads: RequestHandler = async (_req, res) => {
  res.json(ok(await getDistributionLeads()));
};
