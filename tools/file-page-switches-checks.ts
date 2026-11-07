import { runtime } from "@widgetarium/data-framework";
import type { Runtime } from "@widgetarium/data-framework";
import { FileSwitchesQuery, FlipFileSwitchCommand, ReloadFileCommand } from "../plugins/files/data/file-page/index.ts";
import { memoryFilePageParts } from "../plugins/files/data/file-page/gateways/file-page-parts/file-page-parts.gateway.ts";
import { FilePageModule } from "../plugins/files/data/file-page/module.ts";
import { check, tally } from "./check-helpers.ts";

function startedTab(): Runtime {
	return runtime()
		.modules(FilePageModule({ injects: memoryFilePageParts() }))
		.start();
}

async function switchesOf(started: Runtime): Promise<unknown> {
	const answered = await started.send(FileSwitchesQuery);
	return answered.ok ? answered.output : answered.reason;
}

const tab = startedTab();
const otherTab = startedTab();

check("a new file tab starts with every switch off and no reload", await switchesOf(tab), { on: [], loads: 0 });

await tab.send(FlipFileSwitchCommand, { name: "wrap" });
await tab.send(FlipFileSwitchCommand, { name: "values" });
check("flipping turns a switch on, each named once", await switchesOf(tab), { on: ["wrap", "values"], loads: 0 });

await tab.send(FlipFileSwitchCommand, { name: "wrap" });
check("flipping again turns it off and leaves the others", await switchesOf(tab), { on: ["values"], loads: 0 });

await tab.send(ReloadFileCommand);
check("reload counts up, so the page draws anew", await switchesOf(tab), { on: ["values"], loads: 1 });

check("another tab keeps its own switches: the module lives per tab app", await switchesOf(otherTab), {
	on: [],
	loads: 0,
});

const refused = await tab.send(FlipFileSwitchCommand, { name: "everything" as "wrap" });
check("a switch the page does not have is refused before anything changes", refused.ok, false);

console.log(
	tally.failed ? `file-page switches: ${tally.failed} check(s) failed` : "file-page switches: all checks passed",
);
process.exit(tally.failed ? 1 : 0);
