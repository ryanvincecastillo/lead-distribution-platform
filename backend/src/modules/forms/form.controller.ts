import type { RequestHandler } from 'express';
import { ok } from '../../lib/http.js';
import { createForm, getForm, getFormBySlug } from './form.service.js';
import type { CreateFormInput } from './form.schema.js';

export const show: RequestHandler = async (_req, res) => {
  res.json(ok(await getForm()));
};

export const create: RequestHandler = async (req, res) => {
  res.status(201).json(ok(await createForm(req.body as CreateFormInput)));
};

export const showPublic: RequestHandler = async (req, res) => {
  res.json(ok(await getFormBySlug(String(req.params.slug))));
};
