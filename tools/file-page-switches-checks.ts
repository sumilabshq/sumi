import { localTransport, runtime } from "@widgetarium/data-framework";
import { fileSystem, navigation } from "@sumi/contract";
import type { Runtime } from "@widgetarium/data-framework";
import { filePage } from "../plugins/files/data/file-page/generated/contract.ts";
import { filePage as filePageModule } from "../plugins/files/data/file-page/generated/module.ts";
import { check, tally } from "./check-helpers.ts";

const UNUSED_CORE = localTransport();
Object.assign(globalThis, { window: new EventTarget() });

function startedTab(): Runtime {
	return runtime()
		.modules(filePageModule({ tabId: "tab-1" }))
		.imports(fileSystem({ over: UNUSED_CORE }), navigation({ over: UNUSED_CORE }))
		.start({ platform: "browser", scope: { workspaceId: "file-page" } });
}

async function switchesOf(started: Runtime): Promise<unknown> {
	const answered = await started.send(filePage.switches.all);
	return answered.ok ? answered.output : answered.reason;
}

const tab = startedTab();
const otherTab = startedTab();

check("a new file tab starts with every switch off and no reload", await switchesOf(tab), { on: [], loads: 0 });

await tab.send(filePage.switches.flip, { name: "wrap" });
await tab.send(filePage.switches.flip, { name: "values" });
check("flipping turns a switch on, each named once", await switchesOf(tab), { on: ["wrap", "values"], loads: 0 });

await tab.send(filePage.switches.flip, { name: "wrap" });
check("flipping again turns it off and leaves the others", await switchesOf(tab), { on: ["values"], loads: 0 });

await tab.send(filePage.switches.reload);
check("reload counts up, so the page draws anew", await switchesOf(tab), { on: ["values"], loads: 1 });

check("another tab keeps its own switches: the module lives per tab app", await switchesOf(otherTab), {
	on: [],
	loads: 0,
});

const refused = await tab.send(filePage.switches.flip, { name: "everything" as "wrap" });
check("a switch the page does not have is refused before anything changes", refused.ok, false);

console.log(
	tally.failed ? `file-page switches: ${tally.failed} check(s) failed` : "file-page switches: all checks passed",
);
process.exit(tally.failed ? 1 : 0);
