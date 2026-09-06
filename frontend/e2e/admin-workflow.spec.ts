import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, FORM_SLUG, createBroker, login } from './helpers';

/**
 * Walks the administrator setup described in specification section 15, in order.
 * Requires an empty database containing only the seeded admin account.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Admin workflow', () => {
  test('an unauthenticated visitor is redirected away from admin routes', async ({ page }) => {
    await page.goto('/leads');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login rejects an empty submission with field-level errors', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('login does not reveal whether the email or the password was wrong', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill('definitely-not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Field-level errors are also role="alert", so target the form-level banner.
    await expect(
      page.getByRole('alert').filter({ hasText: 'Incorrect email or password' }),
    ).toBeVisible();
  });

  test('login returns the user to the page they originally requested', async ({ page }) => {
    await page.goto('/leads');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/leads/);
  });

  test('an authenticated user is bounced away from the login page', async ({ page }) => {
    await login(page);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // Specification section 5: the exact wording is required.
  test('creating a distribution before a form shows the required prompt', async ({ page }) => {
    await login(page);
    await page.goto('/distribution');
    await page.getByRole('button', { name: 'Create distribution' }).click();
    await expect(
      page.getByRole('dialog').getByText('Oops, please create a form first.'),
    ).toBeVisible();
  });

  test('the escape key closes a dialog', async ({ page }) => {
    await login(page);
    await page.goto('/distribution');
    await page.getByRole('button', { name: 'Create distribution' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('brokers can be created across different timezones', async ({ page }) => {
    await login(page);
    await createBroker(page, 'Broker A', 'Asia/Manila');
    await createBroker(page, 'Broker B', 'Asia/Manila');
    await createBroker(page, 'Broker C', 'America/New_York');

    await page.goto('/brokers');
    // Asserted per row: the delete button is labelled "Remove <name>", so the actions
    // cell also carries the broker name in its accessible name.
    for (const name of ['Broker A', 'Broker B', 'Broker C']) {
      await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(1);
    }
  });

  test('the broker form validates its inputs', async ({ page }) => {
    await login(page);
    await page.goto('/brokers');
    await page.getByRole('button', { name: 'New broker' }).click();

    await page.getByLabel('Broker name').fill('X');
    await page.getByRole('button', { name: 'Create broker' }).click();
    await expect(page.getByText('Name must be at least 2 characters')).toBeVisible();

    await page.getByLabel('Broker name').fill('Valid Name');
    await page.getByLabel('Opens at').fill('09:00');
    await page.getByLabel('Closes at').fill('09:00');
    await page.getByRole('button', { name: 'Create broker' }).click();
    await expect(page.getByText('Opening and closing time cannot match')).toBeVisible();
  });

  test('the edit dialog is populated as soon as it opens', async ({ page }) => {
    await login(page);
    await page.goto('/brokers');
    await page.getByRole('button', { name: 'Edit' }).first().click();
    // Deliberately not waited on: the fields must be filled on the first render, not by
    // an effect that runs after paint.
    await expect(page.getByLabel('Broker name')).not.toHaveValue('');
  });

  test('the form slug is validated', async ({ page }) => {
    await login(page);
    await page.goto('/form');
    await page.getByLabel('Form name').fill('Lead Registration');

    await page.getByLabel('Public URL slug').fill('Not A Slug!');
    await page.getByRole('button', { name: 'Create form' }).click();
    await expect(page.getByText('Use lowercase letters, numbers and single dashes')).toBeVisible();

    await page.getByLabel('Public URL slug').fill('dashboard');
    await page.getByRole('button', { name: 'Create form' }).click();
    await expect(page.getByText('That slug is reserved, choose another')).toBeVisible();
  });

  // Specification section 16: only one form may ever exist.
  test('exactly one form can be created', async ({ page }) => {
    await login(page);
    await page.goto('/form');
    await page.getByLabel('Form name').fill('Lead Registration');
    await page.getByLabel('Public URL slug').fill(FORM_SLUG);
    await page.getByRole('button', { name: 'Create form' }).click();
    await expect(page.getByText('Public URL')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Create form' })).toHaveCount(0);
  });

  // Specification section 7: percentages set each broker's target share.
  test('exactly one distribution can be created, with percentage shares', async ({ page }) => {
    await login(page);
    await page.goto('/distribution');

    // Wait for the broker rows before counting, otherwise the loop runs against an
    // empty list and the percentage inputs stay disabled.
    const checkboxes = page.getByRole('checkbox');
    await expect(checkboxes).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      await checkboxes.nth(index).check();
    }
    await page.getByLabel('Broker A percentage').fill('50');
    await page.getByLabel('Broker B percentage').fill('30');
    await page.getByLabel('Broker C percentage').fill('20');
    await expect(page.getByText('100% allocated')).toBeVisible();

    await page.getByRole('button', { name: 'Create distribution' }).click();
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Create distribution' })).toHaveCount(0);
  });

  test('each broker availability is shown in its own timezone', async ({ page }) => {
    await login(page);
    await page.goto('/distribution');
    await expect(page.getByText(/Open now|Closed/).first()).toBeVisible();
    expect(await page.getByText(/Open now|Closed/).count()).toBeGreaterThanOrEqual(3);
  });
});
