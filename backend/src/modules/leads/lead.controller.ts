import type { RequestHandler } from 'express';
import { clientIp, ok, paginated, validatedQuery } from '../../lib/http.js';
import { assignLeadManually, getDashboardStats, getLead, listLeads } from './lead.service.js';
import { submitLead } from './intake.service.js';
import type { LeadQuery, PublicLeadInput } from './lead.schema.js';

export const index: RequestHandler = async (_req, res) => {
  const query = validatedQuery<LeadQuery>(res);
  const { items, total } = await listLeads(query);
  res.json(paginated(items, total, query.page, query.pageSize));
};

export const show: RequestHandler = async (req, res) => {
  res.json(ok(await getLead(Number(req.params.id))));
};

export const assign: RequestHandler = async (req, res) => {
  const { brokerId } = req.body as { brokerId: number };
  res.json(ok(await assignLeadManually(Number(req.params.id), brokerId)));
};

export const stats: RequestHandler = async (_req, res) => {
  res.json(ok(await getDashboardStats()));
};

/** Public, unauthenticated endpoint used by the visitor-facing form. */
export const submit: RequestHandler = async (req, res) => {
  const lead = await submitLead({
    ...(req.body as PublicLeadInput),
    slug: String(req.params.slug),
    ipAddress: clientIp(req),
  });

  // The visitor is never told which broker received them, or whether they were treated
  // as a duplicate — that is internal routing information.
  res.status(201).json(ok({ id: lead.id, submittedAt: lead.createdAt }));
};
