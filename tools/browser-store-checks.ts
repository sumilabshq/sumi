import { readFileSync } from "node:fs";
import { AnswerAskCommand, StopInkCommand } from "../packages/domain/browser/index.ts";
import { BrowserModule } from "../packages/domain/browser/module.ts";
import { MemoryOnceAllowancesGateway } from "../packages/domain/browser/gateways/once-allowances/memory.gateway.ts";
import { activityWith, isSameActivity } from "../packages/domain/browser/shared/lib/ink-activity.ts";
import { effectiveGrants, onceAllowanceOf } from "../packages/domain/browser/shared/lib/once-grants.ts";
import { runtime } from "@widgetarium/data-framework";
import { check } from "./check-helpers.ts";
import { fakeBrowser } from "./browser-fakes.ts";

const STATE_GATEWAYS = [
	"packages/domain/browser/gateways/once-allowances/memory.gateway.ts",
	"packages/domain/browser/gateways/access-asks/memory.gateway.ts",
	"packages/domain/browser/gateways/ink-activity/memory.gateway.ts",
];
const IMPORT_LINE = /^import .*$/gm;
const OTHER_GATEWAY = /gateways\/(?!once-allowances|access-asks|ink-activity)|\.\.\/[a-z-]+\/[a-z-]+\.gateway/;

for (const gateway of STATE_GATEWAYS) {
	const source = readFileSync(new URL(`../${gateway}`, import.meta.url), "utf8");
	const imports = source.match(IMPORT_LINE) ?? [];
	check(
		`${gateway} imports no other gateway`,
		imports.filter((line) => OTHER_GATEWAY.test(line)),
		[],
	);
	check(`${gateway} reads no clock`, /Date\.now|clock|\.until\s*[<>]/.test(source), false);
}

const onceAllowances = new MemoryOnceAllowancesGateway();
let told = 0;
onceAllowances.onceAllowancesChanged(() => {
	told += 1;
});
const expired = onceAllowanceOf("mail.google.com", "tab-1", 0);
onceAllowances.saveOnceAllowances([expired]);
check("the once gateway tells its listeners on a save", told, 1);
check("the once gateway keeps what it is given, expired or not", onceAllowances.onceAllowances(), [expired]);
check(
	"expiry is decided by the read, outside the gateway",
	effectiveGrants([], onceAllowances.onceAllowances(), expired.until).length,
	0,
);
check(
	"a live allowance is a grant",
	effectiveGrants([], onceAllowances.onceAllowances(), expired.until - 1).map(
		({ siteKey, tabId }) => `${siteKey} ${tabId}`,
	),
	["mail.google.com tab-1"],
);

const quiet = {
	reading: null,
	contentReadAt: null,
	stoppedAt: 5,
};
check("an unchanged activity is the same activity", isSameActivity(quiet, activityWith(quiet, { stoppedAt: 5 })), true);
check("a changed activity is not", isSameActivity(quiet, activityWith(quiet, { stoppedAt: 6 })), false);

const stopping = fakeBrowser();
const stoppingApp = runtime()
	.modules(BrowserModule({ injects: stopping.parts }))
	.start();
let inkTold = 0;
stopping.parts.inkActivity.inkActivityChanged(() => {
	inkTold += 1;
});
const stopped = await stoppingApp.send(StopInkCommand);
check("stopping ink is written through the handler", [stopped.ok, inkTold], [true, 1]);
check("and the activity says when", stopping.parts.inkActivity.inkActivity().stoppedAt !== null, true);

const answered = await stoppingApp.send(AnswerAskCommand, {
	id: "gone",
	answer: "site",
});
check(
	"an answer to a question nobody asks is refused by the handler",
	answered.ok ? "ran" : answered.reason,
	"that question was already answered",
);
check("and writes no grant", stopping.grants.changes.length, 0);
