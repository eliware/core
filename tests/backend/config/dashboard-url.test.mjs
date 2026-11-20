import { expect, test } from "@jest/globals";
import validateDashboardUrl from "../../../src/backend/config/dashboard-url.mjs";

test("uses a local URL by default and accepts a configured dashboard URL", () => {
  expect(validateDashboardUrl(undefined, 9300)).toBe("http://127.0.0.1:9300/");
  expect(validateDashboardUrl("https://router.example.com/status", 9300)).toBe(
    "https://router.example.com/status",
  );
});

test.each([
  "invalid",
  "ftp://router.example.com",
  "https://user:pass@router.example.com/",
  "https://user@router.example.com/",
  "http://127.0.0.1:9300/",
  "http://127.1/",
  "http://0.0.0.0/",
  "http://10.1.2.3/",
  "http://192.168.1.1/",
  "http://100.64.0.1/",
  "http://169.254.1.2/",
  "http://172.16.0.1/",
  "http://172.31.255.255/",
  "http://224.0.0.1/",
])("rejects an unsafe dashboard URL %s", (value) => {
  expect(() => validateDashboardUrl(value, 9300)).toThrow("CORE_DASHBOARD_URL");
});

test.each([
  "http://8.8.8.8/",
  "http://100.128.0.1/",
  "http://172.32.0.1/",
  "http://192.0.2.1/",
  "https://router.example.com/",
  "https://[2001:4860:4860::8888]/",
  "http://[::ffff:808:808]/",
])("accepts a public dashboard host %s", (value) => {
  expect(validateDashboardUrl(value, 9300)).toBe(value);
});
