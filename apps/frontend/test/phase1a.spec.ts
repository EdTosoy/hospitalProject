import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { apiUrl, webUrl } from "./support/urls";

test("rejects invalid image optimizer requests without losing availability", async ({
  request,
}) => {
  for (const url of [
    "/_next/image?url=%2Flogo.png&w=invalid&q=75",
    "/_next/image?url=%2Ffile.svg&w=32&q=75",
  ]) {
    expect((await request.get(url)).status()).toBe(400);
    expect((await request.get("/login")).status()).toBe(200);
  }
});

for (const timezoneId of ["Asia/Manila", "UTC", "America/Los_Angeles"]) {
  test(`birth dates retain their calendar day in ${timezoneId}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: webUrl,
      timezoneId,
      locale: "en-US",
    });
    try {
      const login = await context.request.post(`${apiUrl}/auth/login`, {
        headers: { Origin: webUrl },
        data: {
          email: "doctor@hospital.com",
          password: "browser-test-password",
        },
      });
      expect(login.status()).toBe(201);
      const suffix = randomUUID().slice(0, 8);
      const created = await context.request.post(
        `${apiUrl}/patients/register`,
        {
          headers: { Origin: webUrl },
          data: {
            firstName: "Calendar",
            lastName: suffix,
            dob: "2000-02-29",
            gender: "OTHER",
            phone: "+81 (0)3 1234 5678 ext. 9",
          },
        },
      );
      expect(created.status()).toBe(201);
      const patient = await created.json();
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/dashboard/patients");
      const record = page
        .getByTestId("patient-record")
        .filter({ hasText: `Calendar ${suffix}` });
      await record.locator("summary").click();
      await expect(
        record.getByText("2/29/2000", { exact: true }),
      ).toBeVisible();
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/dashboard/consult/${patient.id}`);
        await expect(
          page.getByText("2/29/2000", { exact: true }),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
      await context.request.post(`${apiUrl}/auth/logout`, {
        headers: { Origin: webUrl },
      });
      const patientLogin = await context.request.post(`${apiUrl}/auth/login`, {
        headers: { Origin: webUrl },
        data: {
          email: "patient@hospital.com",
          password: "browser-test-password",
        },
      });
      expect(patientLogin.status()).toBe(201);
      await page.goto("/dashboard/profile");
      await expect(page.getByText("1/1/1990", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Edit patient details" }).click();
      await expect(
        page.getByLabel("Date of birth", { exact: true }),
      ).toHaveValue("1990-01-01");
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
