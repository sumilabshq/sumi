import { AppFrameFleet } from "../apps/studio/src/features/app-frame/lib/app-frame-fleet.ts";
import type { FailAnswer, FailedRelease } from "../apps/studio/src/features/app-frame/lib/app-frame-fleet.ts";
import { check } from "./check-helpers.ts";

const READY_MS = 80;
const PAST_READY_MS = 250;
const APP = "hello";
const FRAME = "f1";

interface FleetUnderTest {
	readonly fleet: AppFrameFleet;
	readonly failed: FailedRelease[];
	readonly problems: string[];
}

export async function fleetChecks(): Promise<void> {
	await readyClockChecks();
	await busyChecks();
	await failAnswerChecks();
}

function fleetOf(answer: (failed: FailedRelease) => Promise<FailAnswer> = () => Promise.resolve({ ok: true })) {
	const failed: FailedRelease[] = [];
	const problems: string[] = [];
	const fleet = new AppFrameFleet({
		fail: (release) => {
			failed.push(release);
			return answer(release);
		},
		onProblem: (reason) => problems.push(reason),
		readyTimeoutMs: READY_MS,
	});
	return { fleet, failed, problems } satisfies FleetUnderTest;
}

function currentsOf(version: string): ReadonlyMap<string, { version: string; pageUrl: string }> {
	return new Map([[APP, { version, pageUrl: `/apps/${APP}/${version}/index.html` }]]);
}

function pause(ms: number): Promise<void> {
	return new Promise((settle) => setTimeout(settle, ms));
}

async function readyClockChecks(): Promise<void> {
	const hidden = fleetOf();
	hidden.fleet.currentsAre(currentsOf("1.0.0"));
	hidden.fleet.seat(FRAME, APP, false);
	await pause(PAST_READY_MS);
	check("a hidden frame is never failed for a slow ready", hidden.failed.length, 0);
	hidden.fleet.shownIs(FRAME, true);
	await pause(PAST_READY_MS);
	check("once shown, the ready clock runs out and fails the version", hidden.failed, [{ id: APP, version: "1.0.0" }]);

	const away = fleetOf();
	away.fleet.currentsAre(currentsOf("1.0.0"));
	away.fleet.documentVisibleIs(false);
	away.fleet.seat(FRAME, APP, true);
	await pause(PAST_READY_MS);
	check("a shown frame in a hidden document is not failed", away.failed.length, 0);
	away.fleet.documentVisibleIs(true);
	await pause(PAST_READY_MS);
	check("the clock runs once the document is visible again", away.failed.length, 1);

	const erring = fleetOf();
	erring.fleet.currentsAre(currentsOf("1.0.0"));
	erring.fleet.seat(FRAME, APP, false);
	erring.fleet.failedStart(FRAME, "boom");
	check("an error before ready fails the start at once, shown or not", erring.failed, [{ id: APP, version: "1.0.0" }]);

	const proven = fleetOf();
	proven.fleet.currentsAre(currentsOf("1.0.0"));
	proven.fleet.seat(FRAME, APP, true);
	proven.fleet.ready(FRAME);
	proven.fleet.failedStart(FRAME, "later");
	await pause(PAST_READY_MS);
	check("an error after ready is not a failed start", proven.failed.length, 0);
}

async function busyChecks(): Promise<void> {
	const { fleet } = fleetOf();
	fleet.currentsAre(currentsOf("1.0.0"));
	fleet.seat(FRAME, APP, true);
	fleet.ready(FRAME);
	fleet.busyIs(FRAME, true);
	fleet.currentsAre(currentsOf("1.0.1"));
	check("a shown busy frame keeps its version", fleet.runningOf(FRAME)?.version, "1.0.0");
	fleet.shownIs(FRAME, false);
	check("switching away does not reload a busy frame", fleet.runningOf(FRAME)?.version, "1.0.0");
	fleet.busyIs(FRAME, false);
	check("the frame reloads once it is not busy", fleet.runningOf(FRAME)?.version, "1.0.1");
	await pause(0);
}

async function failAnswerChecks(): Promise<void> {
	const refused = fleetOf(() => Promise.resolve({ ok: false, reason: "the installer said no" }));
	refused.fleet.currentsAre(currentsOf("1.0.2"));
	const unseat = refused.fleet.seat(FRAME, APP, true);
	await pause(PAST_READY_MS);
	check(
		"a refused fail is reported",
		refused.problems.some((problem) => problem.includes("the installer said no")),
		true,
	);
	await pause(PAST_READY_MS);
	check("the fleet forgets a refused fail, so the next timeout fails it again", refused.failed.length >= 2, true);
	unseat();

	const thrown = fleetOf(() => Promise.reject(new Error("the link broke")));
	thrown.fleet.currentsAre(currentsOf("1.0.2"));
	thrown.fleet.seat(FRAME, APP, false);
	thrown.fleet.failedStart(FRAME, "boom");
	await pause(10);
	check(
		"a thrown fail is reported",
		thrown.problems.some((problem) => problem.includes("the link broke")),
		true,
	);
	thrown.fleet.failedStart(FRAME, "boom again");
	check("after a thrown fail the version can be failed again", thrown.failed.length, 2);
}
