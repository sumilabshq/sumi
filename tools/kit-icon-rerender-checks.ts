import { createElement as h } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { layBehaviorGlobals } from "./behaviors-dom.ts";
import { check, tally } from "./check-helpers.ts";

layBehaviorGlobals();
const { Icon } = await import("../packages/shared/kit/src/icons/icon.tsx");
const RERENDERS = 5;

const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
flushSync(() => root.render(h(Icon, { name: "tick" })));

const changes = {
	count: 0,
};
new MutationObserver((records) => {
	changes.count += records.length;
}).observe(host, {
	subtree: true,
	childList: true,
});

for (let render = 0; render < RERENDERS; render += 1) {
	flushSync(() => root.render(h(Icon, { name: "tick", size: 16 })));
}

await new Promise((settled) => setTimeout(settled, 0));
check("an icon re-rendered with the same name keeps its drawing untouched", changes.count, 0);

flushSync(() => root.render(h(Icon, { name: "plus" })));
await new Promise((settled) => setTimeout(settled, 0));
check("an icon given another name draws the new picture", changes.count > 0, true);

console.log(tally.failed ? `kit icon: ${tally.failed} check(s) failed` : "kit icon: all checks passed");
process.exit(tally.failed ? 1 : 0);
