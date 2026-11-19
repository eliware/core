export default function compareInventories(localFiles, partnerFiles) {
  const localPaths = new Set(localFiles.keys());
  const partnerPaths = new Set(partnerFiles.keys());
  const errors = [];
  for (const file of localPaths) {
    if (!partnerPaths.has(file)) errors.push(`Partner repo is missing ${file}.`);
  }
  for (const file of partnerPaths) {
    if (!localPaths.has(file)) errors.push(`This repo is missing ${file}.`);
  }
  return {
    errors,
    matchingPaths: [...localPaths].filter((file) => partnerPaths.has(file)).sort(),
  };
}
