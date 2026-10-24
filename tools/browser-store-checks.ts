import { readFileSync } from "node:fs";
import { MemoryOnceAllowancesStore } from "../packages/domain/browser/shared/lib/once-allowances-store.ts";
import { MemoryInkActivityStore } from "../packages/domain/browser/shared/lib/ink-activity-store.ts";
import { effectiveGrants, onceAllowanceOf } from "../packages/domain/browser/shared/lib/once-grants.ts";
import { check } from "./check-helpers.ts";

const STORES = [
	"packages/domain/browser/shared/lib/once-allowances-store.ts",
	"packages/domain/browser/shared/lib/browser-asks-store.ts",
	"packages/domain/browser/shared/lib/ink-activity-store.ts",
];
const IMPORT_LINE = /^import .*$/gm;

for (const store of STORES) {
	const imports = readFileSync(new URL(`../${store}`, import.meta.url), "utf8").match(IMPORT_LINE) ?? [];
	check(
		`${store} imports no gateway`,
		imports.filter((line) => /gateway/i.test(line)),
		[],
	);
}

const onceSource = readFileSync(new URL(`../${STORES[0]}`, import.meta.url), "utf8");
check("the once store reads no clock", /Date\.now|clockGateway|\.until\s*[<>]/.test(onceSource), false);

function debugLines(run: () => void): readonly string[] {
	const said: string[] = [];
	const debug = console.debug;
	console.debug = (line: string) => void said.push(line);

	try {
		run();
	} finally {
		console.debug = debug;
	}

	return said;
}

const onceStore = new MemoryOnceAllowancesStore();
let told = 0;
onceStore.watch(() => {
	told += 1;
});
const expired = onceAllowanceOf("mail.google.com", "tab-1", 0);
const logged = debugLines(() => {
	onceStore.keep([expired], "test");
	onceStore.keep([{ ...expired }], "test again");
});
check("the once store tells its watchers once per change", told, 1);
check("and logs was and became once", logged.length === 1 && logged[0]?.includes("[] → "), true);
check("the once store keeps what it is given, expired or not", onceStore.allowances(), [expired]);
check(
	"expiry is decided by the read, outside the store",
	effectiveGrants([], onceStore.allowances(), expired.until).length,
	0,
);
check(
	"a live allowance is a grant",
	effectiveGrants([], onceStore.allowances(), expired.until - 1).map(({ siteKey, tabId }) => `${siteKey} ${tabId}`),
	["mail.google.com tab-1"],
);

const inkStore = new MemoryInkActivityStore();
let inkTold = 0;
inkStore.watch(() => {
	inkTold += 1;
});
debugLines(() => {
	inkStore.change({ stoppedAt: 5 }, "test");
	inkStore.change({ stoppedAt: 5 }, "test again");
});
check("the ink store exits early when nothing changed", inkTold, 1);
