export default function countDnsmasqLeases(source, now) {
  return source.split(/\r?\n/u).reduce((total, line) => {
    const fields = line.trim().split(/\s+/u);
    return /^\d+$/u.test(fields[0]) && Number(fields[0]) * 1000 > now && Boolean(fields[2])
      ? total + 1
      : total;
  }, 0);
}
