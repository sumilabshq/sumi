import { layJsdomGlobals } from "./jsdom-globals.ts";
import { tally } from "./check-helpers.ts";

layJsdomGlobals();
await import("./requests-policy-checks.ts");
await import("./requests-wire-checks.ts");
await import("./requests-react-checks.ts");
await import("./requests-module-checks.ts");
await import("./requests-event-checks.ts");

console.log(tally.failed ? `requests: ${tally.failed} check(s) failed` : "requests: all checks passed");
process.exit(tally.failed ? 1 : 0);
