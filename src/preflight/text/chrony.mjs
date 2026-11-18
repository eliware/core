export default function validateChrony(file, text) {
  const errors = [];
  const commands = new Set(
    "acquisitionport allow authdata authselectmode bindcmdaddress bindcmdallow bindacqaddress bindacqdevice clientloglimit cmdallow cmdport confdir dumponexit dumpdir driftfile dscp local hwtimestamp initstepslew keyfile leapsecmode leapseclist leapsectz log logbanner logchange logdir mailonchange makestep maxchange maxclockerror maxdelay maxdelaydevratio maxdelayratio maxdistance maxdrift maxjitter maxslewrate maxupdateskew minsources ntsdumpdir ntstrustedcerts ntsservercert ntsserverkey orphan pidfile port ratelimit rawmeasurements refclock rtcfile rtconutc rtcsync server peer pool smoothtime sourcedir stratumweight tempcomp user trust refresh tz utility scheduling".split(
      " ",
    ),
  );
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const value = line.replace(/#.*$/u, "").trim();
    if (!value) continue;
    const [command, ...args] = value.split(/\s+/u);
    if (!commands.has(command))
      errors.push(`FAIL ${file}:${index + 1}: unknown chrony directive ${command}.`);
    else if (command === "allow" && args.length !== 1)
      errors.push(`FAIL ${file}:${index + 1}: allow needs one network.`);
    else if (["server", "pool", "peer"].includes(command) && !args[0])
      errors.push(`FAIL ${file}:${index + 1}: ${command} needs a host.`);
    else if (
      command === "makestep" &&
      (args.length !== 2 || args.some((part) => !Number.isFinite(Number(part))))
    )
      errors.push(`FAIL ${file}:${index + 1}: makestep needs two numbers.`);
  }
  return errors;
}
