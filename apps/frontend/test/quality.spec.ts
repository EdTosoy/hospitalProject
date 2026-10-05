import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";

const api = "http://localhost:3000";
const origin = { Origin: "http://localhost:3001" };
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser-test-password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
test("separate staff sessions refresh queue and scheduling without reload", async ({
  page,
  browser,
}) => {
  const unique = randomUUID().slice(0, 8);
  await login(page, "doctor@hospital.com");
  const staff = await browser.newContext();
  try {
    const staffPage = await staff.newPage();
    await login(staffPage, "frontdesk@hospital.com");
    const profile = await staff.request.post(`${api}/patients/register`, {
      headers: origin,
      data: {
        firstName: `Live${unique}`,
        lastName: "Patient",
        dob: "1990-01-01",
        gender: "OTHER",
        phone: "09123456789",
      },
    });
    expect(profile.status()).toBe(201);
    const patient = await profile.json();
    await page.goto("/dashboard/queue");
    await expect(
      page.getByRole("heading", { name: "Patient Queue", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`Live${unique} Patient`, { exact: true }),
    ).toHaveCount(0);
    const added = await staff.request.post(`${api}/queue/add-to-queue`, {
      headers: origin,
      data: { patientId: patient.id },
    });
    expect(added.status()).toBe(201);
    await expect(
      page.getByText(`Live${unique} Patient`, { exact: true }),
    ).toBeVisible({ timeout: 12000 });
    // Finish our own synthetic visit so later queue scenarios remain deterministic.
    const entry = await added.json();
    expect(
      (
        await staff.request.patch(`${api}/queue/${entry.id}/complete`, {
          headers: origin,
        })
      ).status(),
    ).toBe(200);
    await page.goto("/dashboard/appointment");
    const visit = await staff.request.post(`${api}/appointments`, {
      headers: origin,
      data: {
        patientId: patient.id,
        dateTime: new Date(Date.now() + 86400000 * 3).toISOString(),
        reason: `Live visit ${unique}`,
      },
    });
    expect(visit.status()).toBe(201);
    const record = page
      .getByTestId("appointment-record")
      .filter({ hasText: `Live visit ${unique}` });
    await expect(record).toBeVisible({ timeout: 12000 });
    const appointment = await visit.json();
    expect(
      (
        await staff.request.patch(`${api}/appointments/${appointment.id}`, {
          headers: origin,
          data: { status: "CANCELLED" },
        })
      ).status(),
    ).toBe(200);
    await expect(record.getByText("CANCELLED", { exact: true })).toBeVisible({
      timeout: 12000,
    });
  } finally {
    await staff.close();
  }
});

test("overdue payments, exact PHP totals, explicit legacy review and private cookie sessions", async ({
  page,
}) => {
  const unique = randomUUID().slice(0, 8);
  await login(page, "billing@hospital.com");
  const selectors = await page.request.get(`${api}/patients`);
  expect(selectors.status()).toBe(200);
  const patient = (await selectors.json())[0];
  expect(Object.keys(patient).sort()).toEqual(["firstName", "id", "lastName"]);
  const overdue = await page.request.post(`${api}/billing`, {
    headers: origin,
    data: {
      patientId: patient.id,
      amount: 17.12,
      status: "OVERDUE",
      description: `Overdue ${unique}`,
    },
  });
  expect(overdue.status()).toBe(201);
  const requireBackend = createRequire(resolve("../backend/package.json"));
  const { Pool } = requireBackend("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const legacyId = randomUUID();
  try {
    await pool.query(
      'INSERT INTO "Billing" (id,"patientId",amount,description) VALUES ($1,$2,$3,$4)',
      [legacyId, patient.id, 17.125, `Legacy ${unique}`],
    );
  } finally {
    await pool.end();
  }
  await page.goto("/dashboard/billing");
  await page
    .getByRole("combobox", { name: "Filter by status" })
    .selectOption("OVERDUE");
  const bill = page
    .getByRole("article")
    .filter({ hasText: `Overdue ${unique}` });
  await expect(bill).toContainText("₱17.12");
  await bill.getByRole("button", { name: "Mark paid" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm action" })
    .click();
  await expect(bill).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Filter by status" })
    .selectOption("ALL");
  await expect(bill).toContainText("PAID");
  const legacy = page
    .getByRole("article")
    .filter({ hasText: `Legacy ${unique}` });
  await expect(legacy).toContainText("17.125 · currency unconfirmed");
  await expect(legacy.getByRole("button", { name: "Mark paid" })).toHaveCount(
    0,
  );
  await legacy.locator("summary").click();
  await legacy.getByLabel("Confirmed PHP amount").fill("17.13");
  await legacy.getByRole("button", { name: "Confirm PHP amount" }).click();
  await expect(legacy).toContainText("₱17.13");
  await expect(legacy.getByRole("button", { name: "Mark paid" })).toBeVisible();
  const preserved = await (
    await page.request.get(`${api}/billing/${legacyId}`)
  ).json();
  expect(preserved).toMatchObject({
    legacyAmount: 17.125,
    amountMinor: 1713,
    currency: "PHP",
  });
  expect(
    await page.evaluate(() => localStorage.getItem("auth-storage")),
  ).toBeNull();
  const cookies = await page.context().cookies(api);
  const session = cookies.find((cookie) => cookie.name === "hospital_session");
  expect(session?.httpOnly).toBe(true);
  expect(
    await page.evaluate(() => document.cookie.includes("hospital_session")),
  ).toBe(false);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Billing", exact: true }),
  ).toBeVisible();
  await page.getByRole("button").filter({ hasText: "@" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get(`${api}/auth/me`)).status()).toBe(401);
});
