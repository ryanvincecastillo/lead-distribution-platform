import type { Page } from '@playwright/test';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin123!';

export const FORM_SLUG = 'lead-registration';

export async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

/** Creates a broker that is open around the clock, every day, in the given timezone. */
export async function createBroker(page: Page, name: string, timezone: string) {
  await page.goto('/brokers');
  const firstTime = page.getByRole('button', { name: 'Add your first broker' });
  const trigger = (await firstTime.count())
    ? firstTime
    : page.getByRole('button', { name: 'New broker' });
  await trigger.click();

  await page.getByLabel('Broker name').fill(name);
  await page.getByLabel('Timezone').selectOption(timezone);
  await page.getByLabel('Opens at').fill('00:00');
  await page.getByLabel('Closes at').fill('23:59');
  for (const day of ['Sat', 'Sun']) {
    await page.getByRole('button', { name: day, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Create broker' }).click();
  await page.getByRole('cell', { name }).first().waitFor();
}

export async function editBroker(page: Page, name: string, apply: () => Promise<void>) {
  await page.goto('/brokers');
  await page.getByRole('row').filter({ hasText: name }).getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Broker name').waitFor();
  await apply();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}

/** Submits the public form as an anonymous visitor. */
export async function submitLead(page: Page, name: string, email: string, phone = '+639170000000') {
  await page.goto(`/${FORM_SLUG}`);
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Phone number').fill(phone);
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('heading', { name: 'Thank you' }).waitFor();
}

export async function apiJson<T>(page: Page, path: string): Promise<T> {
  const response = await page.request.get(`/api${path}`);
  return (await response.json()) as T;
}
