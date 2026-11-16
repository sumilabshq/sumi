import { pins } from "../plugins/tabs/pinned-tabs/data/pins/generated/contract.ts";
import { check, tally } from "./check-helpers.ts";
import { bystanderChecks, chatDuplicateChecks, chatInPlaceChecks, chatPinChecks, inPlaceChecks, storeChecks, workspaceChecks } from "./pins-stand-edges.ts";
import {
	STORM_ROUNDS,
	WINDOW_SCALES,
	breachesOf,
	closePinTab,
	closeWindow,
	openPin,
	openWindow,
	percentilesOf,
	pinIds,
	worldOf,
} from "./pins-stand-world.ts";
import type { World } from "./pins-stand-world.ts";

interface ScaleReport {
	readonly windows: number;
	readonly ops: number;
	readonly breaches: number;
	readonly seconds: number;
	readonly latencyMs: Readonly<Record<string, number>>;
}

const reports: ScaleReport[] = [];

function anyOf<T>(values: readonly T[]): T {
	const value = values[Math.floor(Math.random() * values.length)];

	if (value === undefined) {
		throw new Error("nothing to pick from");
	}

	return value;
}

async function raceChecks(world: World): Promise<void> {
	for (const id of pinIds) {
		const opens = await Promise.all(world.labels.map((label) => openPin(world, label, id)));
		const openers = opens.filter((one) => one.heldBy === null && one.refusal === null);
		const owner = openers[0]?.label ?? "none";
		const sentAway = opens.filter((one) => one.heldBy === owner).length;
		check(
			`${world.labels.length} windows press ${id} at once: one opens it, every other is sent to that window`,
			[openers.length, sentAway, breachesOf(world)],
			[1, world.labels.length - 1, []],
		);
	}
}

async function freedChecks(world: World): Promise<void> {
	const [first, second] = world.labels;

	if (first === undefined || second === undefined) {
		return;
	}

	await openPin(world, first, "pin-free");
	await closeWindow(world, first);
	const reopened = await openPin(world, second, "pin-free");
	check("a closed window frees its pin: another window opens it at once", [reopened.heldBy, breachesOf(world)], [null, []]);
	await openWindow(world, first);
	await closePinTab(world, second, "pin-free");
	const afterClose = await openPin(world, first, "pin-free");
	check("a pin whose tab was closed opens again in any window", afterClose.heldBy, null);
}

async function stormRound(world: World): Promise<void> {
	await Promise.all(
		world.labels.map(async (label) => {
			if (!world.live.has(label)) {
				await openWindow(world, label);
				return;
			}

			const roll = Math.random();

			if (roll < 0.6) {
				await openPin(world, label, anyOf(pinIds));
				return;
			}

			if (roll < 0.9) {
				await closePinTab(world, label, anyOf(pinIds));
				return;
			}

			await closeWindow(world, label);
		}),
	);
}

async function stormChecks(world: World): Promise<number> {
	let breaches = 0;

	for (let round = 0; round < STORM_ROUNDS; round += 1) {
		await stormRound(world);
		breaches += breachesOf(world).length;
	}

	check(`${STORM_ROUNDS} rounds of random opens, closes and window closes keep every pin open once and owned by a live window`, breaches, 0);
	return breaches;
}

async function scaleRun(windows: number): Promise<void> {
	const world = worldOf(windows + 1);
	const live = world.labels.slice(0, windows);
	const ghost = world.labels[windows] ?? "ghost";
	const started = performance.now();
	await Promise.all(live.map((label) => openWindow(world, label)));
	const scoped: World = { ...world, labels: live };
	await raceChecks(scoped);
	await freedChecks(scoped);
	await bystanderChecks(world, ghost, live[0] ?? "w1");
	await workspaceChecks(scoped);
	await inPlaceChecks(scoped);
	await chatInPlaceChecks(scoped);
	await chatPinChecks(scoped);
	await chatDuplicateChecks(scoped);
	const breaches = await stormChecks(scoped);
	reports.push({
		windows,
		ops: world.latencies.length,
		breaches,
		seconds: Math.round((performance.now() - started) / 100) / 10,
		latencyMs: percentilesOf(world.latencies),
	});
}


async function pinsStoreChecks(): Promise<void> {
	const world = worldOf(50);
	const pin = (id: string) => ({ id, app: "canvas", address: "", title: id, icon: "canvas", favicon: null });
	await Promise.all(world.clients.map((client) => client.send(pins.pins.pin, pin("same"))));
	const once = await world.clients[0]?.send(pins.pins.all);
	check("50 windows pin the same tab at once: one pin", once?.ok ? once.output.pins.length : once?.reason, 1);
	await Promise.all(world.clients.map((client, at) => client.send(pins.pins.pin, pin(`p${at}`))));
	await Promise.all(world.clients.map((client) => client.send(pins.pins.unpin, { id: "same" })));
	const many = await world.clients[0]?.send(pins.pins.all);
	const ids = many?.ok ? many.output.pins.map(({ id }) => id) : [];
	check("50 different pins at once, then 50 unpins of one: 50 pins, each once", [ids.length, new Set(ids).size], [50, 50]);
}

for (const windows of WINDOW_SCALES) {
	await scaleRun(windows);
}

await pinsStoreChecks();
await storeChecks();
console.log(JSON.stringify(reports, null, 2));

if (tally.failed > 0) {
	console.log(`pins stand: ${tally.failed} failed`);
	process.exit(1);
}

console.log("pins stand: all checks passed");
process.exit(0);
