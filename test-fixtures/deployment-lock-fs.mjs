export default function createFileSystem(uid = process.getuid?.() ?? 1000) {
  const files = new Map();
  const handles = new Map();
  const directories = new Set();
  let nextHandle = 1;
  return {
    files,
    directories,
    mkdirSync(path) {
      if (directories.has(path)) throw Object.assign(new Error("exists"), { code: "EEXIST" });
      directories.add(path);
    },
    lstatSync(path) {
      if (!directories.has(path)) throw new Error("missing directory");
      return {
        uid,
        mode: 0o40700,
        isDirectory: () => true,
        isSymbolicLink: () => false,
      };
    },
    openSync(path, flags) {
      if (flags === "wx" && files.has(path))
        throw Object.assign(new Error("exists"), { code: "EEXIST" });
      const handle = nextHandle++;
      files.set(path, "");
      handles.set(handle, path);
      return handle;
    },
    readFileSync(path) {
      if (!files.has(path)) throw Object.assign(new Error("missing"), { code: "ENOENT" });
      return files.get(path);
    },
    writeFileSync(handle, content) {
      files.set(handles.get(handle), content);
    },
    closeSync() {},
    unlinkSync(path) {
      if (!files.delete(path)) throw Object.assign(new Error("missing"), { code: "ENOENT" });
    },
  };
}
