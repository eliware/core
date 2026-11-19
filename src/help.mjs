export default function writeHelp(write) {
  write("Usage: core-cli [--help|--version]");
  write("       core-cli preflight");
  write("       core-cli catalog");
  write("       core-cli compare <partner repo>");
  write("       core-cli status [component] [--repo <path>]");
  write("       core-cli reload [component] [--repo <path>]");
  write("Validate, inspect, and operate configured router components.");
  write("--help     Print this help.");
  write("--version  Print the package version.");
  write("No arguments print this help.");
  write("preflight  Check this router repository.");
  write("catalog    List configured router components.");
  write("compare    Check this repository against its HA partner.");
  write("status     Check configured systemd units.");
  write("reload     Run configured systemd reload or restart actions.");
  write("--repo     Use a router repository path. The default is the current directory.");
  write("Use --help or --version alone.");
  write("Other invalid arguments log an error and set exit code 2.");
  write("Validation, status, or reload failures set exit code 1.");
  write("Unknown components and invalid command arguments set exit code 2.");
}
