export default function createPairRepo(name) {
  const localIp = name === "core1" ? "10.0.0.1" : "10.0.0.2";
  const peerIp = name === "core1" ? "10.0.0.2" : "10.0.0.1";
  const asn = name === "core1" ? 65001 : 65002;
  const peerAsn = name === "core1" ? 65002 : 65001;
  const master = name === "core1";
  const weight = 300;
  const frr = [
    `hostname ${name}.purinton.us`,
    `router bgp ${asn}`,
    ` bgp router-id ${localIp}`,
    ` neighbor ${peerIp} remote-as ${peerAsn}`,
    ` neighbor ${peerIp} description core peer`,
    ` neighbor ${peerIp} weight 250`,
    " neighbor 10.0.0.10 remote-as 65200",
    ` neighbor 10.0.0.10 weight ${weight}`,
    " neighbor 10.0.0.20 remote-as 65200",
    " neighbor 10.0.0.20 weight 200",
  ].join("\n");
  const kea = {
    Dhcp4: {
      "hooks-libraries": [
        {
          parameters: {
            "high-availability": [
              {
                "this-server-name": `${name}.purinton.us`,
                peers: [
                  { name: "core1.purinton.us", role: "primary", url: "http://10.0.0.1:8000/" },
                  { name: "core2.purinton.us", role: "secondary", url: "http://10.0.0.2:8000/" },
                ],
              },
            ],
          },
        },
      ],
    },
  };
  const instance = (id, state, priority) => `vrrp_instance VI_${id} {
  state ${state}
  interface enX0
  virtual_router_id ${id}
  priority ${priority}
  unicast_src_ip ${localIp}
  unicast_peer { ${peerIp} }
  virtual_ipaddress { 192.0.2.${id}/24 }
}`;
  const keepalived = `global_defs {\n    router_id ${name.toUpperCase()}\n}\n${instance(169, master ? "MASTER" : "BACKUP", master ? 101 : 100)}\n${instance(170, master ? "BACKUP" : "MASTER", master ? 100 : 101)}`;
  return {
    "package.json": JSON.stringify({ name: `@eliware/${name}`, version: "15.2.0" }),
    "etc/frr/frr.conf": frr,
    "etc/kea/kea-dhcp4.conf": JSON.stringify(kea, null, 2),
    "etc/keepalived/keepalived.conf": keepalived,
    "etc/conntrackd/conntrackd.conf": `IPv4_address ${localIp}\nIPv4_Destination_Address ${peerIp}\n`,
    "scripts/frr-connected-prefix.sh": `address="${localIp}/24"\n`,
    "etc/named.conf": `include "/eliware/${name}/etc/named.rfc1912.zones";\n`,
    "etc/named.rfc1912.zones": 'zone "example.test" { type master; };\n',
  };
}
