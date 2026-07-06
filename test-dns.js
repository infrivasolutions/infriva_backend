import dns from "node:dns";
import dnsPromises from "node:dns/promises";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

try {
  const result = await dnsPromises.resolveSrv(
    "_mongodb._tcp.cluster0.mto7oba.mongodb.net",
  );

  console.log(result);
} catch (err) {
  console.error(err);
}
