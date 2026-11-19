export default {
  components: [
    { configPaths: ["etc/named.conf"], action: { operation: "reload", unit: "named.service" } },
  ],
};
