export default function parseChronyTracking(source) {
  const fields = Object.fromEntries(
    source.split(/\r?\n/u).flatMap((line) => {
      const index = line.indexOf(":");
      return index < 0 ? [] : [[line.slice(0, index).trim(), line.slice(index + 1).trim()]];
    }),
  );
  if (!fields["Leap status"]) throw new Error("chrony tracking data is unavailable");
  const stratum = Number(fields.Stratum);
  return {
    synchronized: fields["Leap status"] === "Normal",
    stratum: Number.isFinite(stratum) ? stratum : null,
    reference: fields.Reference,
    leapStatus: fields["Leap status"],
    systemTime: fields["System time"],
    lastOffset: fields["Last offset"],
    rmsOffset: fields["RMS offset"],
    lastUpdate: fields["Ref time (UTC)"],
  };
}
