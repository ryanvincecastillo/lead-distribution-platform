import type { RequestHandler } from 'express';
import { ok } from '../../lib/http.js';
import {
  createBroker,
  deleteBroker,
  getBroker,
  listBrokerLeads,
  listBrokers,
  updateBroker,
} from './broker.service.js';
import type { CreateBrokerInput, UpdateBrokerInput } from './broker.schema.js';

export const index: RequestHandler = async (_req, res) => {
  res.json(ok(await listBrokers()));
};

export const show: RequestHandler = async (req, res) => {
  res.json(ok(await getBroker(Number(req.params.id))));
};

export const leads: RequestHandler = async (req, res) => {
  res.json(ok(await listBrokerLeads(Number(req.params.id))));
};

export const create: RequestHandler = async (req, res) => {
  const broker = await createBroker(req.body as CreateBrokerInput);
  res.status(201).json(ok(broker));
};

export const update: RequestHandler = async (req, res) => {
  res.json(ok(await updateBroker(Number(req.params.id), req.body as UpdateBrokerInput)));
};

export const destroy: RequestHandler = async (req, res) => {
  await deleteBroker(Number(req.params.id));
  res.status(204).send();
};
