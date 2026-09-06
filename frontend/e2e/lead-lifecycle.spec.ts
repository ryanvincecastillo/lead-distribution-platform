import { test, expect } from '@playwright/test';
import { FORM_SLUG, apiJson, editBroker, login, submitLead } from './helpers';

/**
 * Covers the visitor-facing flow and the routing rules from specification sections 10–14.
 * Runs after admin-workflow.spec.ts, which creates the brokers, form and distribution.
 */
test.describe.configure({ mode: 'serial' });

interface Broker {
  name: string;
  sentToday: number;
}

interface Lead {
  status: string;
  ipAddress: string;
  broker: { name: string } | null;
}

test.describe('Lead lifecycle', () => {
  test('the public form is reachable without a session', async ({ page }) => {
    await page.goto(`/${FORM_SLUG}`);
    await expect(page.getByRole('heading', { name: 'Lead Registration' })).toBeVisible();
  });

  test('the public form validates its inputs', async ({ page }) => {
    await page.goto(`/${FORM_SLUG}`);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Please enter your full name')).toBeVisible();
    await expect(page.getByText('Email is required')).toBeVisible();

    await page.getByLabel('Full name').fill('Test Visitor');
    await page.getByLabel('Email address').fill('not-an-email');
    await page.getByLabel('Phone number').fill('abc');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
    await expect(page.getByText('Enter a valid phone number')).toBeVisible();
  });

  test('an unknown slug returns a 404 rather than an empty form', async ({ page }) => {
    const response = await page.goto('/no-such-form');
    expect(response?.status()).toBe(404);
  });

  // Specification section 7: the deficit rule should converge on the configured shares.
  test('ten submissions are split 5 / 3 / 2 across a 50/30/20 distribution', async ({ page }) => {
    for (let index = 1; index <= 10; index += 1) {
      await submitLead(page, `Visitor ${index}`, `visitor${index}@example.com`);
    }

    await login(page);
    const { data } = await apiJson<{ data: Broker[] }>(page, '/brokers');
    const counts = Object.fromEntries(data.map((broker) => [broker.name, broker.sentToday]));

    expect([counts['Broker A'], counts['Broker B'], counts['Broker C']]).toEqual([5, 3, 2]);
  });

  // Specification section 10, step 2.
  test('submitted emails are trimmed and lowercased', async ({ page }) => {
    await submitLead(page, 'Mixed Case', '  MiXeD@Example.COM  ');
    await login(page);
    await page.goto('/leads');
    await expect(page.getByText('mixed@example.com').first()).toBeVisible();
  });

  // Specification section 16: the IP address must be stored and visible.
  test('the visitor IP address is captured and displayed', async ({ page }) => {
    await login(page);
    const { data } = await apiJson<{ data: Lead[] }>(page, '/leads?pageSize=5');
    expect(data.length).toBeGreaterThan(0);
    for (const lead of data) {
      expect(lead.ipAddress).not.toBe('');
      expect(lead.ipAddress).not.toBe('unknown');
    }

    await page.goto('/leads');
    await expect(page.getByRole('columnheader', { name: 'IP address' })).toBeVisible();
  });

  // Specification section 10, step 3.
  test('a repeated email becomes a duplicate and cannot be assigned', async ({ page }) => {
    await submitLead(page, 'Visitor One Again', 'visitor1@example.com');
    await login(page);
    await page.goto('/leads');
    await page.getByRole('button', { name: 'Duplicate' }).click();

    const rows = page.getByRole('row').filter({ hasText: 'duplicate' });
    await expect(rows.first()).toBeVisible();
    await expect(rows.first().getByRole('button', { name: 'Assign' })).toHaveCount(0);
  });

  // Specification section 12.
  test('a broker that has reached its daily cap is skipped', async ({ page }) => {
    await login(page);
    await editBroker(page, 'Broker A', async () => {
      await page.getByLabel('Daily cap').fill('5');
    });

    await submitLead(page, 'Cap Test', 'cap-test@example.com');

    const { data } = await apiJson<{ data: Lead[] }>(page, '/leads?pageSize=1');
    expect(data[0].status).toBe('sent');
    expect(data[0].broker?.name).not.toBe('Broker A');
  });

  // Specification section 11.
  test('a lead is marked unsent when every broker is closed', async ({ page }) => {
    await login(page);
    for (const name of ['Broker A', 'Broker B', 'Broker C']) {
      await editBroker(page, name, async () => {
        await page.getByLabel('Opens at').fill('03:00');
        await page.getByLabel('Closes at').fill('03:05');
      });
    }

    await submitLead(page, 'Closed Test', 'closed-test@example.com');

    const { data } = await apiJson<{ data: Lead[] }>(page, '/leads?pageSize=1');
    expect(data[0].status).toBe('unsent');
  });

  // Specification section 14.
  test('an unsent lead can be manually assigned to a broker', async ({ page }) => {
    await login(page);
    await page.goto('/leads');
    await page.getByRole('button', { name: 'Unsent' }).click();
    await page.getByRole('button', { name: 'Assign' }).first().click();
    await page.getByLabel('Broker').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Assign lead' }).click();
    await expect(page.getByText('Lead assigned')).toBeVisible();
  });

  test('the distribution detail page lists every outcome with a reason', async ({ page }) => {
    await login(page);
    await page.goto('/distribution');
    await page.getByRole('link', { name: /View detail/ }).click();
    await expect(page.getByRole('heading', { name: 'Lead history' })).toBeVisible();

    for (const status of ['sent', 'unsent', 'duplicate', 'failed']) {
      await expect(page.getByText(status, { exact: true }).first()).toBeVisible();
    }

    await page.getByRole('button', { name: 'Duplicate' }).click();
    await expect(page.getByRole('row').filter({ hasText: 'duplicate' }).first()).toBeVisible();
  });

  // Specification section 13: all seven columns are required.
  test('the broker detail page shows every required column', async ({ page }) => {
    await login(page);
    await page.goto('/brokers');
    await page.getByRole('link', { name: /Broker B/ }).click();
    await expect(page).toHaveURL(/\/brokers\/\d+/);

    for (const header of [
      'Lead name',
      'Email',
      'Phone',
      'IP address',
      'Form name',
      'Date received',
      'Status',
    ]) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test('the theme choice survives a reload', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('the navigation collapses on a phone viewport', async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/leads');
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await expect(page.getByRole('link', { name: 'Brokers' })).toBeVisible();
  });

  test('signing out clears the session', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/leads');
    await expect(page).toHaveURL(/\/login/);
  });
});
