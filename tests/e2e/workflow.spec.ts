import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('student submission, administrator assignment, officer completion and reporting', async ({
  browser,
}) => {
  await mkdir('docs/screenshots', { recursive: true });
  const studentContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const officerContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const student = await studentContext.newPage();
  const admin = await adminContext.newPage();
  const officer = await officerContext.newPage();
  const errors: string[] = [];
  for (const page of [student, admin, officer])
    page.on('pageerror', (error) => errors.push(error.message));
  const password = 'Browser-test-password-8333';
  const base = 'http://127.0.0.1:3101';
  await student.goto(`${base}/register`);
  await student.getByLabel('Full name').fill('Tomi Adewale');
  await student.getByLabel('Email address').fill('tomi@example.edu');
  await student.getByLabel('Password').fill(password);
  await student.getByRole('button', { name: 'Create account' }).click();
  await expect(
    student.getByRole('heading', { name: 'Hello, Tomi.' }),
  ).toBeVisible();
  await student.getByRole('link', { name: 'New request', exact: true }).click();
  await student
    .getByLabel('Request title')
    .fill('Leaking pipe in hostel bathroom');
  await student
    .getByRole('combobox', { name: 'Category', exact: true })
    .selectOption({ label: 'Plumbing' });
  await student.getByLabel('Location').fill('Hostel B, first floor');
  await student
    .getByLabel('Describe the issue')
    .fill('Water is leaking from the pipe beneath the bathroom sink.');
  await student.screenshot({
    path: 'docs/screenshots/request-form.png',
    fullPage: true,
  });
  await student.getByRole('button', { name: 'Submit request' }).click();
  await expect(
    student.getByRole('heading', { name: 'Request details' }),
  ).toBeVisible();
  const requestUrl = student.url();
  await expect(
    student.getByText('Your request has been submitted.'),
  ).toBeVisible();

  await admin.goto(`${base}/login`);
  await admin.getByLabel('Email address').fill('admin@example.edu');
  await admin.getByLabel('Password').fill(password);
  await admin.screenshot({
    path: 'docs/screenshots/login.png',
    fullPage: true,
  });
  await admin.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    admin.getByRole('heading', { name: 'Hello, Amina.' }),
  ).toBeVisible();
  await admin.getByRole('link', { name: 'Users', exact: true }).click();
  await admin.getByRole('button', { name: 'Add user' }).click();
  await admin.getByLabel('Full name').fill('Daniel Okafor');
  await admin.getByLabel('Email address').fill('daniel@example.edu');
  await admin.getByLabel('Initial password').fill(password);
  await admin.getByRole('button', { name: 'Create user', exact: true }).click();
  await expect(admin.getByText('User created.', { exact: true })).toBeVisible();
  await admin.screenshot({
    path: 'docs/screenshots/user-management.png',
    fullPage: true,
  });
  await admin.goto(requestUrl);
  await admin
    .getByRole('combobox', { name: 'Maintenance officer', exact: true })
    .selectOption({ label: 'Daniel Okafor · daniel@example.edu' });
  await admin
    .getByRole('button', { name: 'Assign request', exact: true })
    .click();
  await expect(admin.getByText('Assigned to Daniel Okafor.')).toBeVisible();
  await admin.screenshot({
    path: 'docs/screenshots/admin-assignment.png',
    fullPage: true,
  });

  await officer.goto(`${base}/login`);
  await officer.getByLabel('Email address').fill('daniel@example.edu');
  await officer.getByLabel('Password').fill(password);
  await officer.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    officer.getByRole('heading', { name: 'Hello, Daniel.' }),
  ).toBeVisible();
  await officer.screenshot({
    path: 'docs/screenshots/officer-dashboard.png',
    fullPage: true,
  });
  await officer
    .getByRole('link', { name: 'Leaking pipe in hostel bathroom', exact: true })
    .click();
  await officer
    .getByLabel('Progress note')
    .fill('Inspected the pipe and started replacing the joint.');
  await officer.getByRole('button', { name: 'Start work' }).click();
  await expect(
    officer.getByRole('button', { name: 'Mark as completed' }),
  ).toBeVisible();
  await officer
    .getByLabel('Progress note')
    .fill('Replaced the joint and checked that there are no leaks.');
  await officer.getByRole('button', { name: 'Mark as completed' }).click();
  await expect(
    officer.getByText(
      'Replaced the joint and checked that there are no leaks.',
    ),
  ).toBeVisible();

  await student.reload();
  await expect(
    student.getByText(
      'Replaced the joint and checked that there are no leaks.',
    ),
  ).toBeVisible();
  await student.screenshot({
    path: 'docs/screenshots/request-tracking.png',
    fullPage: true,
  });
  await student.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(
    student.getByRole('heading', { name: 'Hello, Tomi.' }),
  ).toBeVisible();
  await student.screenshot({
    path: 'docs/screenshots/student-dashboard.png',
    fullPage: true,
  });
  await student.getByRole('link', { name: 'My requests', exact: true }).click();
  await student.getByLabel('Search requests').fill('does not exist');
  await expect(student.getByText('No requests to show')).toBeVisible();
  await student.getByLabel('Search requests').fill('Leaking');
  await expect(
    student.getByRole('link', {
      name: 'Leaking pipe in hostel bathroom',
      exact: true,
    }),
  ).toBeVisible();
  await student.setViewportSize({ width: 390, height: 844 });
  await student.getByRole('button', { name: 'Open navigation' }).click();
  await student.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(
    student.getByRole('heading', { name: 'Hello, Tomi.' }),
  ).toBeVisible();
  await student.screenshot({
    path: 'docs/screenshots/mobile-dashboard.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(
    await student.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);

  await admin.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(
    admin.getByRole('heading', { name: 'Hello, Amina.' }),
  ).toBeVisible();
  await admin.screenshot({
    path: 'docs/screenshots/admin-dashboard.png',
    fullPage: true,
  });
  await admin.getByRole('link', { name: 'Reports', exact: true }).click();
  await expect(admin.getByText('100%', { exact: true })).toBeVisible();
  await admin.screenshot({
    path: 'docs/screenshots/reports.png',
    fullPage: true,
  });
  await student.getByRole('button', { name: 'Open navigation' }).click();
  await student.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(
    student.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await Promise.all([
    studentContext.close(),
    adminContext.close(),
    officerContext.close(),
  ]);
});
