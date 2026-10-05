import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";

async function checkLayouts(page: Page, name: string) {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    if (width === 390 || width === 1280)
      await page.screenshot({
        path: test.info().outputPath(`${name}-${width}.png`),
        fullPage: true,
      });
  }
}

test("real six-role workflows, error states, and responsive layouts", async ({
  page,
}) => {
  const unique = randomUUID().slice(0, 8);
  const email = `browser-${unique}@example.test`;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("link", { name: "Log In", exact: true }),
    ).toBeVisible();
  }
  await page.goto("/register");
  await checkLayouts(page, "register");
  await page.getByLabel("Full Name", { exact: true }).fill("Browser Patient");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("browser-password");
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill("browser-password");
  await page
    .getByRole("button", { name: "Create Account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  async function login(account: string, password = "browser-test-password") {
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(account);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  async function logout() {
    await page.getByRole("button").filter({ hasText: "@" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
  }
  await login(email, "browser-password");
  await expect(page.getByRole("main")).toHaveCount(1);
  await page.goto("/dashboard/billing");
  await expect(
    page.getByRole("alert").filter({ hasText: "You do not have access" }),
  ).toBeVisible();
  await page.goto("/dashboard/profile");
  await page.getByRole("button", { name: "Edit Profile" }).click();
  await page
    .getByLabel("Name", { exact: true })
    .fill("Updated Browser Patient");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(
    page.getByRole("heading", { name: "Updated Browser Patient" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Updated Browser Patient" }),
  ).toBeVisible();
  await page.getByLabel("First name", { exact: true }).fill(`Browser${unique}`);
  await page.getByLabel("Last name", { exact: true }).fill("Patient");
  await page.getByLabel("Date of birth", { exact: true }).fill("1990-01-01");
  await page.getByLabel("Phone", { exact: true }).fill("09123456789");
  await page.getByLabel("Gender", { exact: true }).selectOption("OTHER");
  await page.getByRole("button", { name: "Save patient profile" }).click();
  await expect(
    page.getByText("Your patient profile is ready for booking."),
  ).toBeVisible();
  await checkLayouts(page, "profile");
  await page.getByRole("button", { name: "Edit patient details" }).click();
  await page.getByLabel("Phone", { exact: true }).fill("09987654321");
  await page.getByRole("button", { name: "Save patient details" }).click();
  await expect(page.getByText("09987654321", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("09987654321", { exact: true })).toBeVisible();
  await page.goto("/dashboard");
  await expect(
    page.getByText("Your next appointment", { exact: true }),
  ).toBeVisible();
  await checkLayouts(page, "patient-overview");
  await page.goto("/dashboard/appointment");
  await expect(page.getByText("No appointments scheduled")).toBeVisible();
  const date = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
  await page.getByLabel("Date", { exact: true }).fill(date);
  await page.getByLabel("Time", { exact: true }).fill("10:30");
  await page
    .getByLabel("Reason", { exact: true })
    .fill(`Browser consultation ${unique}`);
  await page
    .getByLabel("Doctor", { exact: true })
    .selectOption({ label: "Dr. House" });
  await page
    .getByRole("button", { name: "Book Appointment", exact: true })
    .click();
  await expect(page.getByText(`Browser consultation ${unique}`)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Toggle Sidebar" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("appointments-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Toggle Sidebar" }).click();
  await expect(page.getByRole("link", { name: "My Profile" })).toBeVisible();
  await page.getByRole("link", { name: "My Profile", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My Profile", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "My Appointments", exact: true }),
  ).not.toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();
  await logout();
  await login("doctor@hospital.com");
  await expect(
    page.getByText("Today's schedule", { exact: true }),
  ).toBeVisible();
  await checkLayouts(page, "doctor-overview");
  await page.goto("/dashboard/appointment");
  const appointment = page
    .getByTestId("appointment-record")
    .filter({ hasText: `Browser consultation ${unique}` });
  await appointment
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(
    appointment.getByText("CONFIRMED", { exact: true }),
  ).toBeVisible();
  await appointment
    .getByRole("button", { name: "Complete appointment", exact: true })
    .click();
  await expect(
    appointment.getByText("COMPLETED", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard/patients");
  await page
    .getByRole("searchbox", { name: "Search patient name or phone" })
    .fill("no-matching-patient-xyz");
  await expect(
    page.getByText("No matching patients", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search patient name or phone" })
    .fill(`Browser${unique}`);
  const patient = page
    .getByTestId("patient-record")
    .filter({ hasText: `Browser${unique}` });
  await expect(
    patient.getByText("09987654321", { exact: true }),
  ).not.toBeVisible();
  await patient.locator("summary").click();
  await expect(patient.getByText("09987654321", { exact: true })).toBeVisible();
  await checkLayouts(page, "patient-directory");
  await patient.getByRole("link", { name: "Consult" }).click();
  await page.getByRole("button", { name: "Add SOAP Note" }).click();
  await page.getByRole("button", { name: "Save Note", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Enter at least one section" }),
  ).toBeVisible();
  await page
    .getByLabel("Assessment", { exact: true })
    .fill(`Browser assessment ${unique}`);
  await page.getByLabel("Plan", { exact: true }).fill("Follow up");
  await page.getByRole("button", { name: "Save Note", exact: true }).click();
  await expect(page.getByText(`Browser assessment ${unique}`)).toBeVisible();
  await checkLayouts(page, "consultation");
  await page.getByRole("button", { name: "Add SOAP Note" }).click();
  await page.getByLabel("Subjective", { exact: true }).fill("Unsaved draft");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Go back", exact: true })
    .click();
  await expect(page.getByLabel("Subjective", { exact: true })).toHaveValue(
    "Unsaved draft",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm action" })
    .click();
  await expect(page.getByLabel("Subjective", { exact: true })).toHaveCount(0);
  await expect(page.getByText(`Browser assessment ${unique}`)).toBeVisible();
  await logout();
  await login("frontdesk@hospital.com");
  await page.goto("/dashboard/patients");
  await page.getByRole("button", { name: "Add Patient", exact: true }).click();
  await page.getByLabel("First Name", { exact: true }).fill(`Walkin${unique}`);
  await page.getByLabel("Last Name", { exact: true }).fill("Patient");
  await page.getByLabel("Date of Birth", { exact: true }).fill("1985-02-03");
  await page.getByLabel("Phone", { exact: true }).fill("09123456789");
  await page.getByLabel("Gender", { exact: true }).selectOption("OTHER");
  await page
    .getByRole("button", { name: "Register Patient", exact: true })
    .click();
  await expect(
    page.getByText(`Walkin${unique} Patient`, { exact: true }),
  ).toBeVisible();
  await page
    .getByTestId("patient-record")
    .filter({ hasText: `Browser${unique}` })
    .getByRole("button", { name: "Add to Queue" })
    .click();
  await page.goto("/dashboard/queue");
  await expect(
    page.getByText(`Browser${unique} Patient`, { exact: true }),
  ).toBeVisible();
  await checkLayouts(page, "queue");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("queue-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Call Next" }).click();
  await page.getByRole("button", { name: "Complete", exact: true }).click();
  await logout();
  await login("billing@hospital.com");
  await page.goto("/dashboard/billing");
  await page
    .getByLabel("Patient", { exact: true })
    .selectOption({ label: `Browser${unique} Patient` });
  await page
    .getByLabel("Description", { exact: true })
    .fill(`Browser bill ${unique}`);
  await page.getByLabel("Amount", { exact: true }).fill("123.45");
  await page.getByRole("button", { name: "Create bill", exact: true }).click();
  const bill = page
    .getByRole("article", { includeHidden: true })
    .filter({ hasText: `Browser bill ${unique}` });
  await bill.getByRole("button", { name: "Mark paid" }).click();
  await expect(bill).toContainText("PENDING");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm action" })
    .click();
  await expect(bill).toContainText("PAID");
  await checkLayouts(page, "billing");
  await page.screenshot({
    path: test.info().outputPath("billing-desktop.png"),
    fullPage: true,
  });
  await logout();
  await login("nurse@hospital.com");
  await page.goto("/dashboard/patients");
  await page
    .getByTestId("patient-record")
    .filter({ hasText: `Browser${unique}` })
    .getByRole("link", { name: "Consult" })
    .click();
  await expect(page.getByText(`Browser assessment ${unique}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add SOAP Note" })).toHaveCount(
    0,
  );
  await logout();
  await login("admin@hospital.com");
  await page.getByRole("link", { name: "Billing", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Billing", exact: true }),
  ).toBeVisible();
  await logout();
  await login(email, "browser-password");
  await page.goto("/dashboard/appointment");
  await page.getByLabel("Date", { exact: true }).fill(date);
  await page.getByLabel("Time", { exact: true }).fill("11:30");
  await page
    .getByLabel("Reason", { exact: true })
    .fill(`Cancel consultation ${unique}`);
  await page
    .getByRole("button", { name: "Book Appointment", exact: true })
    .click();
  const cancelled = page
    .getByTestId("appointment-record")
    .filter({ hasText: `Cancel consultation ${unique}` });
  await cancelled.getByRole("button", { name: "Cancel appointment" }).click();
  await expect(cancelled).toContainText("PENDING");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm action" })
    .click();
  await expect(cancelled.getByText("CANCELLED", { exact: true })).toBeVisible();
  await page.route("**/appointments", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Test outage" }),
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("alert").filter({ hasText: "Unable to load appointments" }),
  ).toBeVisible();
  await page.unroute("**/appointments");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page
      .getByTestId("appointment-record")
      .filter({ hasText: `Cancel consultation ${unique}` }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Filter by status" })
    .selectOption("CONFIRMED");
  await expect(
    page.getByText("No matching appointments", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Filter by status" })
    .selectOption("CANCELLED");
  await expect(
    page
      .getByTestId("appointment-record")
      .filter({ hasText: `Cancel consultation ${unique}` }),
  ).toBeVisible();
  await page.context().clearCookies();
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  expect(errors).toEqual([]);
});

test("keyboard navigation, password visibility, and login failure feedback", async ({
  page,
}) => {
  await page.goto("/login");
  await checkLayouts(page, "login");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Back to Pulse" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await page
    .getByLabel("Email", { exact: true })
    .fill("unknown-ui-test@example.test");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("incorrect-password");
  await expect(password).toHaveAttribute("autocomplete", "current-password");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Invalid credentials" }),
  ).toBeVisible();
});
