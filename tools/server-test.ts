import { tally } from "./check-helpers.ts";

await import("./server-http-checks.ts");
await import("./server-bundle-checks.ts");

console.log(tally.failed ? `server: ${tally.failed} check(s) failed` : "server: all checks passed");
process.exit(tally.failed ? 1 : 0);
