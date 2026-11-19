import collectRouterMetric from "./collect/router.mjs";
import collectServiceMetric from "./collect/services.mjs";
import classifyMetricType from "../../metrics/metric-types.mjs";

export default function collectMetric(metric, options = {}) {
  return classifyMetricType(metric.type) === "service"
    ? collectServiceMetric(metric, options)
    : collectRouterMetric(metric, options);
}
