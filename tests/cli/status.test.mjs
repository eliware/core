import { expect, jest, test } from "@jest/globals";
import checkCatalogStatus from "../../src/cli/status.mjs";

const component = (id, unit = `${id}.service`) => ({
  id,
  name: id.toUpperCase(),
  health: { unit },
});

test("reports when the catalog is missing", async () => {
  await expect(checkCatalogStatus({ catalog: null, run: jest.fn() })).resolves.toEqual({
    ok: false,
    usageError: undefined,
    lines: ["No service catalog is configured."],
  });
});

test("reports an unknown component", async () => {
  const result = await checkCatalogStatus({
    catalog: { components: [component("dns")] },
    componentId: "dhcp",
    run: jest.fn(),
  });
  expect(result).toEqual({
    ok: false,
    usageError: true,
    lines: ["Unknown component: dhcp"],
  });
});

test("checks matching health units once and reports each component", async () => {
  const run = jest.fn().mockResolvedValue(undefined);
  const result = await checkCatalogStatus({
    catalog: {
      components: [component("dns", "shared.service"), component("proxy", "shared.service")],
    },
    run,
  });
  expect(result).toEqual({
    ok: true,
    lines: ["Healthy: DNS (shared.service)", "Healthy: PROXY (shared.service)"],
  });
  expect(run).toHaveBeenCalledTimes(1);
});

test("returns a failure when a systemd unit is inactive", async () => {
  const run = jest.fn().mockRejectedValue(new Error("inactive"));
  await expect(
    checkCatalogStatus({ catalog: { components: [component("dns")] }, run }),
  ).resolves.toEqual({
    ok: false,
    lines: ["Unhealthy: DNS (dns.service)"],
  });
});
