import { describe, expect, it } from 'vitest';
import { selectBroker, type BrokerCandidate } from '../engine.js';

/** Wednesday 2026-09-09, 10:00 in Manila — inside every default schedule below. */
const OPEN_INSTANT = new Date('2026-09-09T02:00:00Z');

const openSchedule = {
  timezone: 'Asia/Manila',
  openingTime: '09:00',
  closingTime: '18:00',
  workingDays: '1,2,3,4,5',
};

const candidate = (overrides: Partial<BrokerCandidate> & Pick<BrokerCandidate, 'brokerId'>): BrokerCandidate => ({
  brokerName: `Broker ${overrides.brokerId}`,
  percentage: 50,
  activeInDistribution: true,
  brokerIsActive: true,
  brokerIsDeleted: false,
  dailyCap: 0,
  sentToday: 0,
  schedule: openSchedule,
  ...overrides,
});

describe('selectBroker — deficit rule', () => {
  it('reproduces the worked example from the specification', () => {
    const result = selectBroker(
      [
        candidate({ brokerId: 1, brokerName: 'Broker A', percentage: 50, sentToday: 4 }),
        candidate({ brokerId: 2, brokerName: 'Broker B', percentage: 30, sentToday: 3 }),
        candidate({ brokerId: 3, brokerName: 'Broker C', percentage: 20, sentToday: 3 }),
      ],
      OPEN_INSTANT,
    );

    expect(result.totalSentToday).toBe(10);

    const [a, b, c] = result.evaluations;
    expect(a.targetAfterLead).toBe(5.5);
    expect(a.deficit).toBe(1.5);
    expect(b.targetAfterLead).toBe(3.3);
    expect(b.deficit).toBeCloseTo(0.3, 6);
    expect(c.targetAfterLead).toBeCloseTo(2.2, 6);
    expect(c.deficit).toBeCloseTo(-0.8, 6);

    expect(result.selectedBrokerId).toBe(1);
  });

  it('converges on the configured split over many leads', () => {
    const state = [
      { id: 1, percentage: 50, sent: 0 },
      { id: 2, percentage: 30, sent: 0 },
      { id: 3, percentage: 20, sent: 0 },
    ];

    for (let lead = 0; lead < 100; lead += 1) {
      const { selectedBrokerId } = selectBroker(
        state.map((broker) =>
          candidate({ brokerId: broker.id, percentage: broker.percentage, sentToday: broker.sent }),
        ),
        OPEN_INSTANT,
      );
      const winner = state.find((broker) => broker.id === selectedBrokerId);
      expect(winner).toBeDefined();
      winner!.sent += 1;
    }

    expect(state.map((broker) => broker.sent)).toEqual([50, 30, 20]);
  });

  it('breaks ties toward the broker with fewer leads today', () => {
    const result = selectBroker(
      [
        candidate({ brokerId: 1, percentage: 50, sentToday: 2 }),
        candidate({ brokerId: 2, percentage: 50, sentToday: 1 }),
      ],
      OPEN_INSTANT,
    );

    expect(result.selectedBrokerId).toBe(2);
  });

  it('is deterministic when deficit and volume are identical', () => {
    const result = selectBroker(
      [
        candidate({ brokerId: 7, percentage: 50 }),
        candidate({ brokerId: 3, percentage: 50 }),
      ],
      OPEN_INSTANT,
    );

    expect(result.selectedBrokerId).toBe(3);
  });
});

describe('selectBroker — eligibility filtering', () => {
  it('skips a broker that reached its daily cap', () => {
    const result = selectBroker(
      [
        candidate({ brokerId: 1, percentage: 90, sentToday: 10, dailyCap: 10 }),
        candidate({ brokerId: 2, percentage: 10, sentToday: 0 }),
      ],
      OPEN_INSTANT,
    );

    expect(result.evaluations[0].skipReason).toBe('daily_cap_reached');
    expect(result.selectedBrokerId).toBe(2);
  });

  it('treats a zero cap as unlimited', () => {
    const result = selectBroker(
      [candidate({ brokerId: 1, sentToday: 999, dailyCap: 0 })],
      OPEN_INSTANT,
    );
    expect(result.selectedBrokerId).toBe(1);
  });

  it('skips inactive brokers, soft-deleted brokers and brokers disabled in the distribution', () => {
    const result = selectBroker(
      [
        candidate({ brokerId: 1, brokerIsActive: false }),
        candidate({ brokerId: 2, brokerIsDeleted: true }),
        candidate({ brokerId: 3, activeInDistribution: false }),
        candidate({ brokerId: 4 }),
      ],
      OPEN_INSTANT,
    );

    expect(result.evaluations.map((evaluation) => evaluation.skipReason)).toEqual([
      'broker_inactive',
      'broker_deleted',
      'inactive_in_distribution',
      undefined,
    ]);
    expect(result.selectedBrokerId).toBe(4);
  });

  it('skips a broker with a zero percentage share', () => {
    const result = selectBroker([candidate({ brokerId: 1, percentage: 0 })], OPEN_INSTANT);
    expect(result.evaluations[0].skipReason).toBe('zero_percentage');
    expect(result.selectedBrokerId).toBeNull();
  });

  it('skips a broker that is closed at this instant', () => {
    // 22:00 Manila — outside 09:00–18:00
    const result = selectBroker(
      [candidate({ brokerId: 1 })],
      new Date('2026-09-09T14:00:00Z'),
    );

    expect(result.evaluations[0].skipReason).toBe('outside_open_hours');
    expect(result.selectedBrokerId).toBeNull();
  });

  it('respects each broker own timezone when deciding who is open', () => {
    // 2026-09-09T02:00Z = 10:00 Manila (open) and 22:00 the previous day in New York (closed).
    const result = selectBroker(
      [
        candidate({ brokerId: 1, brokerName: 'Manila', schedule: openSchedule }),
        candidate({
          brokerId: 2,
          brokerName: 'New York',
          schedule: { ...openSchedule, timezone: 'America/New_York' },
        }),
      ],
      OPEN_INSTANT,
    );

    expect(result.selectedBrokerId).toBe(1);
    expect(result.evaluations[1].skipReason).toBe('outside_open_hours');
  });

  it('returns no broker when every candidate is filtered out', () => {
    const result = selectBroker(
      [
        candidate({ brokerId: 1, brokerIsActive: false }),
        candidate({ brokerId: 2, sentToday: 5, dailyCap: 5 }),
      ],
      OPEN_INSTANT,
    );

    expect(result.selectedBrokerId).toBeNull();
    expect(result.evaluations.every((evaluation) => !evaluation.eligible)).toBe(true);
  });

  it('still counts skipped brokers toward the day total', () => {
    // A closed broker that already took 8 leads today must not be erased from the
    // denominator, or the open broker's target share would be understated.
    const result = selectBroker(
      [
        candidate({ brokerId: 1, percentage: 50, sentToday: 8, brokerIsActive: false }),
        candidate({ brokerId: 2, percentage: 50, sentToday: 0 }),
      ],
      OPEN_INSTANT,
    );

    expect(result.totalSentToday).toBe(8);
    expect(result.evaluations[1].targetAfterLead).toBe(4.5);
  });
});
