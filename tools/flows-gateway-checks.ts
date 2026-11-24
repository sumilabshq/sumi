import { StoreClient, workspaceRootOf } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import type { Invoke } from "../packages/shared/behaviors/src/tauri-store/store-invoke.ts";
import { keptPlacesParts } from "../plugins/tabs/navigation/data/navigation/gateways/places-parts/places-parts.gateway.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import { FlowsDocSchema } from "../plugins/tabs/navigation/data/navigation/shared/schema/flows.schema.ts";
import type { FlowsDoc } from "../plugins/tabs/navigation/data/navigation/shared/schema/flows.schema.ts";
import { flowBreaksOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-laws.ts";
import { flowsConversionMove } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-moves.ts";
import { flowCountsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/flows/flow-conversion.ts";
import { DEFAULT, FakeStore } from "./host-tauri-fake-store.ts";
import { BUILT_IN_APPS, BUILT_IN_PLACED_APPS } from "./placed-apps-fixture.ts";
import { fixturePlaced } from "./flows-fixture.ts";
import { check, tally } from "./check-helpers.ts";

const NAVIGATION_KEY = `${workspaceRootOf(DEFAULT.id)}:navigation.json`;
const SEEDED_REV = 7;

interface Heard {
	readonly infos: string[];
	readonly warns: string[];
	readonly errors: string[];
}

async function heard<Answer>(run: () => Promise<Answer>): Promise<{ readonly answer: Answer; readonly said: Heard }> {
	const said: Heard = { infos: [], warns: [], errors: [] };
	const { info, warn, error } = console;
	console.info = (...text: unknown[]): void => void said.infos.push(text.map(String).join(" "));
	console.warn = (...text: unknown[]): void => void said.warns.push(text.map(String).join(" "));
	console.error = (...text: unknown[]): void => void said.errors.push(text.map(String).join(" "));

	try {
		return { answer: await run(), said };
	} finally {
		Object.assign(console, { info, warn, error });
	}
}

function seeded(extra: Record<string, unknown> = {}): FakeStore {
	const fake = new FakeStore();
	fake.put(NAVIGATION_KEY, {
		v: 1,
		rev: SEEDED_REV,
		panesCarried: true,
		tabs: JSON.parse(JSON.stringify(fixturePlaced())),
		...extra,
	});
	return fake;
}

function replacesOf(fake: FakeStore): readonly { readonly args: Readonly<Record<string, unknown>> }[] {
	return fake.calls.filter((call) => call.command.endsWith("|replace") && call.args["path"] === "navigation.json");
}

function gatewayOver(invoke: Invoke, isOn: boolean | undefined): ReturnType<typeof keptPlacesParts>["tabs"] {
	const config = { store: new StoreClient(invoke), apps: BUILT_IN_PLACED_APPS };
	return keptPlacesParts(isOn === undefined ? config : { ...config, isFlowsConversionOn: isOn }, DEFAULT.id).tabs;
}

function withoutTimes(flows: FlowsDoc | null): unknown {
	const text = JSON.stringify(flows, (key, value: unknown) =>
		["createdAt", "lastOpenedAt", "at"].includes(key) ? 0 : value,
	);
	return JSON.parse(text ?? "null");
}

function keptDoc(fake: FakeStore): Record<string, unknown> {
	return fake.files.get(NAVIGATION_KEY) ?? {};
}

async function flagOffChecks(): Promise<void> {
	const fake = seeded();
	fake.conversionRefusal = null;
	const { answer } = await heard(() => gatewayOver(fake.invoke, undefined).places());
	check("with the flag at its default no flows are made", answer.flows, null);
	check("nothing is written", replacesOf(fake).length, 0);
	check("and the guard is not even asked", fake.commandsCalled().includes("conversion_refusal"), false);
	check("the old tabs read as before", JSON.stringify(answer.tabs), JSON.stringify(fixturePlaced()));
}

async function refusedChecks(): Promise<void> {
	const fake = seeded();
	const { answer, said } = await heard(() => gatewayOver(fake.invoke, true).places());
	check(
		"a guard that refuses leaves the doc as it was",
		[answer.flows, replacesOf(fake).length, "flows" in keptDoc(fake)],
		[null, 0, false],
	);
	check(
		"and says why, in the log",
		said.warns.some((line) => line.includes("the fake store allows no conversion")),
		true,
	);
	const unanswered = seeded();
	const failing: Invoke = (command, args) =>
		command.endsWith("conversion_refusal")
			? Promise.reject(new Error("no such command"))
			: unanswered.invoke(command, args);
	const silent = await heard(() => gatewayOver(failing, true).places());
	check("a guard that cannot be asked also refuses", [silent.answer.flows, replacesOf(unanswered).length], [null, 0]);
}

async function convertedChecks(): Promise<FlowsDoc | null> {
	const fake = seeded();
	fake.conversionRefusal = null;
	const { answer, said } = await heard(() => gatewayOver(fake.invoke, true).places());
	const writes = replacesOf(fake);
	const stored = FlowsDocSchema.safeParse(keptDoc(fake)["flows"]);
	check("an allowed root is converted in one write", writes.length, 1);
	check(
		"that one write carries the tabs and the flows together",
		writes.map((write) =>
			Object.keys(Object(write.args["doc"]))
				.filter((key) => key === "tabs" || key === "flows")
				.sort(),
		),
		[["flows", "tabs"]],
	);
	check("the stored flows match their schema", stored.success, true);
	check("the gateway reads them back", answer.flows === null ? null : flowCountsOf(answer.flows), {
		folders: 5,
		flows: 24,
		tabs: 45,
		outsideFolders: 16,
	});
	check(
		"every law holds on what was stored",
		answer.flows === null
			? ["no flows"]
			: flowBreaksOf(
					answer.flows,
					answer.tabs.tabs.map(({ id }) => id),
				),
		[],
	);
	check("the tabs are written as they were", JSON.stringify(answer.tabs), JSON.stringify(fixturePlaced()));
	check(
		"the counts are logged",
		said.infos.some((line) => line.includes("5 folders, 24 flows, 45 tabs placed, 16 flows outside folders")),
		true,
	);
	return answer.flows;
}

async function rerunChecks(first: FlowsDoc | null): Promise<void> {
	const fake = seeded();
	fake.conversionRefusal = null;
	await heard(() => gatewayOver(fake.invoke, true).places());
	const afterFirst = replacesOf(fake).length;
	const again = await heard(() => gatewayOver(fake.invoke, true).places());
	check("a restart does not convert again", replacesOf(fake).length, afterFirst);
	check("the flows are the same after it", withoutTimes(again.answer.flows), withoutTimes(first));
	check(
		"and the log says why it did nothing",
		again.said.infos.some((line) => line.includes("already holds flows")),
		true,
	);
}

async function crashChecks(first: FlowsDoc | null): Promise<void> {
	const fake = seeded();
	fake.conversionRefusal = null;
	const crashing: Invoke = (command, args) =>
		command.endsWith("|replace")
			? Promise.reject({ code: "io", detail: "killed before the write" })
			: fake.invoke(command, args);
	await heard(() => gatewayOver(crashing, true).places());
	check(
		"a write that never lands leaves no flows on disk",
		["flows" in keptDoc(fake), keptDoc(fake)["rev"]],
		[false, SEEDED_REV],
	);
	const restarted = await heard(() => gatewayOver(fake.invoke, true).places());
	check("the next start converts the same way", withoutTimes(restarted.answer.flows), withoutTimes(first));
	check("and writes once", replacesOf(fake).length, 1);
}

async function tabWritesKeepFlowsChecks(): Promise<void> {
	const fake = seeded();
	fake.conversionRefusal = null;
	const tabs = gatewayOver(fake.invoke, true);
	const before = (await heard(() => tabs.places())).answer.flows;
	await heard(() =>
		tabs.movePlacedTabs((now) => ({
			next: { ...now, minted: now.minted + 1 },
			reason: "a tab command",
			answer: null,
		})),
	);
	const stored = FlowsDocSchema.safeParse(keptDoc(fake)["flows"]);
	check(
		"a tab command keeps the flows in the doc",
		stored.success && JSON.stringify(stored.data) === JSON.stringify(before),
		true,
	);
	check("and writes the new tabs", Object(keptDoc(fake)["tabs"])["minted"], fixturePlaced().minted + 1);
}

async function unreadableFlowsChecks(): Promise<void> {
	const fake = seeded({ flows: { v: 99, junk: true } });
	fake.conversionRefusal = null;
	const tabs = gatewayOver(fake.invoke, true);
	const { answer } = await heard(() => tabs.places());
	check("flows that cannot be read are not converted over", [answer.flows, replacesOf(fake).length], [null, 0]);
	await heard(() =>
		tabs.movePlacedTabs((now) => ({ next: { ...now, minted: now.minted + 1 }, reason: "a tab command", answer: null })),
	);
	check("a tab command leaves them on disk untouched", keptDoc(fake)["flows"], { v: 99, junk: true });
}

async function memoryChecks(first: FlowsDoc | null): Promise<void> {
	if (first === null) {
		throw new Error("no converted flows to seed the memory gateway");
	}

	const memory = new MemoryTabsGateway(fixturePlaced(), undefined, undefined, first);
	await memory.movePlacedTabs((now) => ({
		next: { ...now, minted: now.minted + 1 },
		reason: "a tab command",
		answer: null,
	}));
	check("a memory gateway keeps flows through a tab command", (await memory.places()).flows, first);
	await memory.movePlaces((now) => ({
		next: { tabs: now.tabs, flows: { ...first, looseFlowIds: [] } },
		reason: "flows change",
		answer: null,
	}));
	const now = await memory.places();
	check(
		"movePlaces writes tabs and flows together",
		[now.tabs.minted, now.flows?.looseFlowIds.length],
		[fixturePlaced().minted + 1, 0],
	);
	const again = await memory.movePlaces(flowsConversionMove({ apps: BUILT_IN_APPS, sourceRev: 1, now: 1 }));
	check(
		"a conversion plan refuses flows that already stand and writes nothing",
		[again.isRefused, (await memory.places()).flows?.looseFlowIds.length],
		[true, 0],
	);
}

await flagOffChecks();
await refusedChecks();
const converted = await convertedChecks();
await rerunChecks(converted);
await crashChecks(converted);
await tabWritesKeepFlowsChecks();
await unreadableFlowsChecks();
await memoryChecks(converted);
console.log(tally.failed ? `flows gateway: ${tally.failed} check(s) failed` : "flows gateway: all checks passed");
process.exit(tally.failed ? 1 : 0);
