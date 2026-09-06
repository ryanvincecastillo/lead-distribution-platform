export type LeadStatus = 'sent' | 'unsent' | 'duplicate' | 'failed';

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
}

export interface Broker {
  id: number;
  name: string;
  email: string | null;
  isActive: boolean;
  dailyCap: number;
  timezone: string;
  openingTime: string;
  closingTime: string;
  workingDays: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sentToday: number;
  totalLeads?: number;
  distribution: { percentage: number; isActive: boolean } | null;
}

export interface LeadForm {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  distribution: { id: number; name: string } | null;
  _count?: { leads: number };
}

export interface DistributionBroker {
  id: number;
  brokerId: number;
  name: string;
  percentage: number;
  isActive: boolean;
  brokerIsActive: boolean;
  timezone: string;
  openingTime: string;
  closingTime: string;
  workingDays: string;
  dailyCap: number;
  sentToday: number;
  isOpenNow: boolean;
  closedReason: string | null;
}

export interface Distribution {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  form: { id: number; name: string; slug: string };
  brokers: DistributionBroker[];
}

export interface LeadEvent {
  id: number;
  type: string;
  message: string;
  context: unknown;
  createdAt: string;
}

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  ipAddress: string;
  status: LeadStatus;
  assignedAt: string | null;
  assignedManual: boolean;
  statusReason: string | null;
  createdAt: string;
  broker: { id: number; name: string } | null;
  form: { id: number; name: string; slug: string } | { name: string } | null;
  events?: LeadEvent[];
}

export interface DashboardStats {
  leads: { sent: number; unsent: number; duplicate: number; failed: number; total: number };
  brokerCount: number;
  form: { id: number; name: string; slug: string } | null;
  distribution: { id: number; name: string } | null;
}

export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
