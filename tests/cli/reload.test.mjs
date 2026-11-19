import { expect, jest, test } from "@jest/globals";
import reloadCatalogComponents from "../../src/cli/reload.mjs";

const component = (id, operation = "reload", unit = `${id}.service`) => ({
  id,
  name: id.toUpperCase(),
  action: { operation, unit },
});

test("runs each distinct catalog action once", async () => {
  const run = jest.fn().mockResolvedValue(undefined);
  const result = await reloadCatalogComponents({
    catalog: {
      components: [
        component("dns", "reload", "shared.service"),
        component("proxy", "reload", "shared.service"),
      ],
    },
    run,
  });
  expect(result).toEqual({ ok: true, lines: ["Completed: reload shared.service"] });
  expect(run).toHaveBeenCalledTimes(1);
});

test("stops after the first failed action", async () => {
  const run = jest.fn().mockRejectedValue(new Error("systemctl failed"));
  const result = await reloadCatalogComponents({
    catalog: { components: [component("dns", "restart")] },
    run,
  });
  expect(result).toEqual({ ok: false, lines: ["Failed: restart dns.service"] });
  expect(run).toHaveBeenCalledTimes(1);
});
