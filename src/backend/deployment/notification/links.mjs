export default function resolveNotificationLinks(githubPayload = {}) {
  const name = githubPayload?.repository?.full_name;
  const repository =
    typeof name === "string" && /^[\w.-]+\/[\w.-]+$/u.test(name)
      ? { name, url: `https://github.com/${name}` }
      : null;
  if (!repository || typeof githubPayload.compare !== "string")
    return { repository, compareUrl: undefined };
  try {
    const compare = new URL(githubPayload.compare);
    if (
      compare.protocol === "https:" &&
      compare.hostname === "github.com" &&
      !compare.username &&
      !compare.password &&
      compare.pathname.startsWith(`/${repository.name}/compare/`)
    ) {
      return { repository, compareUrl: compare.toString() };
    }
  } catch {
    // Ignore malformed GitHub links and keep the repository link.
  }
  return { repository, compareUrl: undefined };
}
