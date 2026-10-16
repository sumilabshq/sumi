import { layJsdomGlobals } from "./jsdom-globals.ts";
import { tally } from "./mediator-check.ts";

layJsdomGlobals();
await import("./mediator-types.ts");
await import("./mediator-send-checks.ts");
await import("./mediator-edge-checks.ts");
await import("./mediator-store-checks.ts");
await import("./mediator-react-checks.ts");
await import("./mediator-handle-checks.ts");
await import("./mediator-watch-checks.ts");
await import("./mediator-platform-checks.ts");

console.log(tally.failed ? `mediator: ${tally.failed} check(s) failed` : "mediator: all checks passed");
process.exit(tally.failed ? 1 : 0);
