export default function writeHelp(write) {
  write("Usage: core-cli [--help|--version]");
  write("       core-cli preflight");
  write("       core-cli compare <partner repo>");
  write("Validate router configuration and compare an HA pair.");
  write("--help     Print this help.");
  write("--version  Print the package version.");
  write("No arguments print this help.");
  write("preflight  Check this router repository.");
  write("compare    Check this repository against its HA partner.");
  write("Use --help or --version alone.");
  write("Other invalid arguments log an error and set exit code 2.");
  write("Validation failures set exit code 1.");
}
