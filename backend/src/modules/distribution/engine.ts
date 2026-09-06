import { evaluateAvailability, type BrokerSchedule } from './schedule.js';

export type SkipReason =
  | 'broker_inactive'
  | 'broker_deleted'
  | 'inactive_in_distribution'
  | 'zero_percentage'
  | 'outside_working_days'
  | 'outside_open_hours'
  | 'invalid_schedule'
  | 'daily_cap_reached';

export interface BrokerCandidate {
  brokerId: number;
  brokerName: string;
  /** Share of traffic this broker should receive, 0–100. */
  percentage: number;
  /** Membership flag on the distribution row, not the broker itself. */
  activeInDistribution: boolean;
  brokerIsActive: boolean;
  brokerIsDeleted: boolean;
  /** 0 means "no cap". */
  dailyCap: number;
  /** Leads already assigned to this broker during its own local day. */
  sentToday: number;
  schedule: BrokerSchedule;
}

export interface BrokerEvaluation {
  brokerId: number;
  brokerName: string;
  eligible: boolean;
  skipReason?: SkipReason;
  percentage: number;
  sentToday: number;
  targetAfterLead?: number;
  deficit?: number;
}

export interface SelectionResult {
  selectedBrokerId: number | null;
  evaluations: BrokerEvaluation[];
  totalSentToday: number;
}

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** Why this broker cannot take the next lead, or null if it can. */
export const findSkipReason = (candidate: BrokerCandidate, at: Date): SkipReason | null => {
  if (candidate.brokerIsDeleted) return 'broker_deleted';
  if (!candidate.brokerIsActive) return 'broker_inactive';
  if (!candidate.activeInDistribution) return 'inactive_in_distribution';
  if (candidate.percentage <= 0) return 'zero_percentage';
  if (candidate.dailyCap > 0 && candidate.sentToday >= candidate.dailyCap) {
    return 'daily_cap_reached';
  }

  const availability = evaluateAvailability(candidate.schedule, at);
  if (!availability.isOpen) return availability.reason ?? 'outside_open_hours';

  return null;
};

/**
 * Picks the broker that is furthest behind its target share.
 *
 *   targetAfterLead = (totalSentToday + 1) * percentage / 100
 *   deficit         = targetAfterLead - brokerSentToday
 *
 * `totalSentToday` sums the day's volume across every broker in the distribution —
 * including brokers that are currently skipped — because the target share is a share of
 * the day's total traffic, not of whatever happens to be open this second. Each broker's
 * own count is measured in its own timezone, which is what the cap rule requires.
 *
 * Ties break toward the broker with fewer leads today, then the lower id so the outcome
 * is deterministic and reproducible in tests.
 */
export const selectBroker = (
  candidates: BrokerCandidate[],
  at: Date = new Date(),
): SelectionResult => {
  const totalSentToday = candidates.reduce((sum, candidate) => sum + candidate.sentToday, 0);

  const evaluations: BrokerEvaluation[] = candidates.map((candidate) => {
    const skipReason = findSkipReason(candidate, at);

    if (skipReason) {
      return {
        brokerId: candidate.brokerId,
        brokerName: candidate.brokerName,
        eligible: false,
        skipReason,
        percentage: candidate.percentage,
        sentToday: candidate.sentToday,
      };
    }

    const targetAfterLead = ((totalSentToday + 1) * candidate.percentage) / 100;

    return {
      brokerId: candidate.brokerId,
      brokerName: candidate.brokerName,
      eligible: true,
      percentage: candidate.percentage,
      sentToday: candidate.sentToday,
      targetAfterLead: round(targetAfterLead),
      deficit: round(targetAfterLead - candidate.sentToday),
    };
  });

  const winner = evaluations
    .filter((evaluation) => evaluation.eligible)
    .sort((a, b) => {
      const deficitGap = (b.deficit ?? 0) - (a.deficit ?? 0);
      if (Math.abs(deficitGap) > 1e-9) return deficitGap;
      if (a.sentToday !== b.sentToday) return a.sentToday - b.sentToday;
      return a.brokerId - b.brokerId;
    })[0];

  return {
    selectedBrokerId: winner?.brokerId ?? null,
    evaluations,
    totalSentToday,
  };
};
