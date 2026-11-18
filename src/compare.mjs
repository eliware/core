import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import listRepositoryFiles from "./repo-files.mjs";
import normalizePairFile from "./pair/normalize.mjs";
import validatePair from "./pair/rules.mjs";
import loadRepository from "./pair/repository.mjs";

export default function compareRepositories(
  root,
  partnerPath,
  { collectFiles = listRepositoryFiles, readFile = readFileSync } = {},
) {
  const partnerRoot = resolve(root, partnerPath);
  if (resolve(root) === partnerRoot)
    return { ok: false, lines: ["FAIL Partner repo must be a different directory."] };
  const localInventory = collectFiles(root);
  const partnerInventory = collectFiles(partnerRoot);
  if (localInventory.error)
    return { ok: false, lines: [`FAIL This repo: ${localInventory.error}`] };
  if (partnerInventory.error)
    return { ok: false, lines: [`FAIL Partner repo: ${partnerInventory.error}`] };

  const local = loadRepository(root, localInventory.files, readFile);
  const partner = loadRepository(partnerRoot, partnerInventory.files, readFile);
  if (local.error || partner.error) {
    return { ok: false, lines: [`FAIL ${local.error ?? partner.error}`] };
  }
  const names = [local.name, partner.name];
  const localFiles = local.files;
  const partnerFiles = partner.files;
  const errors = [];
  const localPaths = new Set(localFiles.keys());
  const partnerPaths = new Set(partnerFiles.keys());
  for (const file of localPaths) {
    if (!partnerPaths.has(file)) errors.push(`Partner repo is missing ${file}.`);
  }
  for (const file of partnerPaths) {
    if (!localPaths.has(file)) errors.push(`This repo is missing ${file}.`);
  }

  const pair = validatePair(names[0], names[1], localFiles, partnerFiles);
  errors.push(...pair.errors);
  if (!pair.nodes || pair.errors.length > 0) {
    return {
      ok: false,
      lines: [
        `FAIL configuration comparison (${errors.length} issues)`,
        ...errors.map((error) => `FAIL ${error}`),
      ],
    };
  }
  const variants = [];
  for (const file of [...localPaths].filter((item) => partnerPaths.has(item)).sort()) {
    const leftText = normalizePairFile(file, localFiles.get(file), pair.nodes?.get(names[0]));
    const rightText = normalizePairFile(file, partnerFiles.get(file), pair.nodes?.get(names[1]));
    if (leftText !== rightText) errors.push(`Unexpected configuration difference: ${file}.`);
    else if (
      localFiles.get(file).replaceAll("\r\n", "\n") !==
      partnerFiles.get(file).replaceAll("\r\n", "\n")
    ) {
      variants.push(file);
    }
  }

  const lines = [
    errors.length === 0
      ? `PASS matching configuration inventory (${localPaths.size} files)`
      : `FAIL configuration comparison (${errors.length} issues)`,
    ...errors.map((error) => `FAIL ${error}`),
  ];
  if (errors.length === 0) {
    lines.push("PASS reciprocal FRR, Kea, Keepalived, and conntrackd settings");
    lines.push(`PASS expected HA differences (${variants.length} files)`);
    lines.push(`HA-specific files (${variants.length}): ${variants.join(", ")}`);
  }
  return { ok: errors.length === 0, lines };
}
