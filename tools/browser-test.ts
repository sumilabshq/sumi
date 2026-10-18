import { layJsdomGlobals } from "./jsdom-globals.ts";
import { tally } from "./check-helpers.ts";

layJsdomGlobals();
await import("./browser-access-checks.ts");
await import("./browser-secret-content-checks.ts");
await import("./browser-guard-checks.ts");
await import("./browser-store-checks.ts");
await import("./browser-gate-checks.ts");
await import("./browser-desk-checks.ts");
await import("./browser-tab-ui-checks.ts");
await import("./browser-state-checks.ts");

console.log(tally.failed ? `browser: ${tally.failed} check(s) failed` : "browser: all checks passed");
process.exit(tally.failed ? 1 : 0);
