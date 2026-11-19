import { expect, test } from "@jest/globals";
import validateDashboardUrl from "../../../src/backend/config/dashboard-url.mjs";

test("uses a local URL by default and accepts a configured dashboard URL", () => {
  expect(validateDashboardUrl(undefined, 9300)).toBe("http://127.0.0.1:9300/");
  expect(validateDashboardUrl("https://router.example/status", 9300)).toBe(
    "https://router.example/status",
  );
});

test.each(["invalid", "ftp://router.example", "https://user:pass@router.example/"])(
  "rejects an unsafe dashboard URL %s",
  (value) => {
    expect(() => validateDashboardUrl(value, 9300)).toThrow("CORE_DASHBOARD_URL");
  },
);
