import type { SpecRead } from "../packages/shared/core/src/app-spec.ts";
import type { Runtime } from "@widgetarium/data-framework";
import { DesignFilesGateway } from "../packages/domain/canvas/gateways/design-files/design-files.gateway.ts";
import { MemoryCanvasMomentGateway } from "../packages/domain/canvas/gateways/canvas-moment/memory.gateway.ts";
import { AgentJobsGateway } from "../packages/domain/canvas/gateways/agent-jobs/agent-jobs.gateway.ts";
import {
	AddPhotosCommand,
	CanvasOpeningQuery,
	FocusWidgetCommand,
	ModeQuery,
	PageChoicesQuery,
	PickVariantCommand,
	ResizeSidebarWidthCommand,
	ReturnNoteQuery,
	ShowPageCommand,
	SidebarQuery,
} from "../packages/domain/canvas/index.ts";
import { canDragLayer } from "../packages/domain/canvas/features/layers/lib/layer-drag.ts";
import type { CanvasLayer } from "../packages/domain/canvas/shared/schema/layer.schema.ts";
import type { DrawnDesign } from "../packages/domain/canvas/shared/schema/drawn-design.schema.ts";
import type { Job, LiveJob } from "../packages/domain/canvas/shared/schema/job.schema.ts";
import {
	FARM_OPENED,
	FixedDesignFolderGateway,
	canvasAppOver,
	canvasPartsOver,
	openedCanvasOver,
} from "./canvas-hosts.ts";

type Check = (what: string, held: unknown, wanted: unknown) => void;

interface HeldFolder {
	readonly folder: FixedDesignFolderGateway;
	readonly release: () => void;
}

const DESIGN: DrawnDesign = {
	screens: [
		{ name: "Home", states: [] },
		{ name: "Other", states: [] },
	],
	references: [],
	widgets: [],
};

const DONE_JOB: Job = {
	id: "home-design",
	app: "Farm",
	title: "Design Home",
	page: "Home",
	phase: "design",
	says: "Draw it.",
	after: [],
	status: "done",
	reason: null,
	question: null,
	session: null,
	notes: [],
	budget: null,
	spent: 0,
	activity: null,
	said: null,
	widgets: [],
	createdAt: 0,
	startedAt: null,
	endedAt: null,
};

export async function checkCanvasRequests(check: Check): Promise<void> {
	await checkPickAfterPageTurn(check);
	await checkChangeSourceLivesWithTheCanvas(check);
	await checkPhotosLandInTheOpenedApp(check);
	await checkProjectWithNoDesignFolder(check);
	await checkAbsentDesignIsStartedByAJob(check);
	await checkReturnNote(check);
	await checkOpensInHand(check);
	await checkSidebarResize(check);
	await checkMomentChangeReReads(check);
	checkLayerDrag(check);
}

async function checkOpensInHand(check: Check): Promise<void> {
	const canvas = await openedCanvasOver(canvasPartsOver(), { ...FARM_OPENED, mode: "pointer" });
	const mode = await canvas.send(ModeQuery);
	check("a canvas opens in hand mode even from a kept opening that says pointer", mode.ok && mode.output.mode, "hand");
}

async function checkReturnNote(check: Check): Promise<void> {
	const parts = canvasPartsOver({ designFolder: new BrokenSpecDesignFolderGateway(async () => DESIGN) });
	const canvas = await openedCanvasOver(parts);
	const answer = await canvas.send(ReturnNoteQuery, { cameFrom: "Notes/Home.md" });
	check(
		"a return to a note answers why when the spec cannot be read, rather than opening the note it came from",
		answer.ok && answer.output.kind === "none" ? answer.output.said.includes("the front matter is broken") : answer,
		true,
	);
	const fromNote = await (
		await openedCanvasOver(canvasPartsOver())
	).send(ReturnNoteQuery, { cameFrom: "Notes/Home.md" });
	check(
		"and with no spec page naming a note it goes back to the note it came from",
		fromNote.ok ? fromNote.output : fromNote.reason,
		{ kind: "note", note: "Notes/Home.md" },
	);
}

async function checkProjectWithNoDesignFolder(check: Check): Promise<void> {
	const canvas = await openedCanvasOver(canvasPartsOver(), { ...FARM_OPENED, page: "" });
	const choices = await canvas.send(PageChoicesQuery);
	check(
		"a canvas over a project with no design folder reads the project's design",
		choices.ok ? choices.output.groups : choices.reason,
		[["Pages"], ["Components"]],
	);
}

async function checkAbsentDesignIsStartedByAJob(check: Check): Promise<void> {
	const absent = new FixedDesignFolderGateway(async () => null);
	const groupsOf = async (canvas: Runtime): Promise<unknown> => {
		const choices = await canvas.send(PageChoicesQuery);
		return choices.ok ? choices.output.groups : choices.reason;
	};
	check(
		"an app with no design and nothing under way says its design is missing, as a refused page named for the app",
		await groupsOf(await openedCanvasOver(canvasPartsOver({ designFolder: absent }))),
		[["Farm"], ["Components"]],
	);
	check(
		"while an app with a job of its own is only starting, so its canvas is empty rather than refused",
		await groupsOf(await openedCanvasOver(canvasPartsOver({ designFolder: absent, agentJobs: new DoneJobsGateway() }))),
		[["Pages"], ["Components"]],
	);
}

async function checkPickAfterPageTurn(check: Check): Promise<void> {
	const held = heldFolder();
	const canvasMoment = new MemoryCanvasMomentGateway();
	const canvas = await openedCanvasOver(canvasPartsOver({ designFolder: held.folder, canvasMoment }));
	const picking = canvas.send(PickVariantCommand, { screen: "Home B" });
	await canvas.send(ShowPageCommand, { page: "Other" });
	held.release();
	await picking;
	check(
		"a variant pick whose page turned while the design was read writes nothing",
		[canvasMoment.moment().page, canvasMoment.moment().variants],
		["Other", {}],
	);
}

async function checkChangeSourceLivesWithTheCanvas(check: Check): Promise<void> {
	const listening = { started: 0, stopped: 0 };
	const folder = new FixedDesignFolderGateway(
		async () => DESIGN,
		() => {
			listening.started += 1;
			return () => void (listening.stopped += 1);
		},
	);
	const canvas = canvasAppOver(canvasPartsOver({ designFolder: folder }));
	const whileRunning = { ...listening };
	canvas.stop();
	check(
		"the design folder's change source starts with the canvas and stops with it, so no poll outlives the view",
		[whileRunning, listening],
		[
			{ started: 1, stopped: 0 },
			{ started: 1, stopped: 1 },
		],
	);
}

async function checkPhotosLandInTheOpenedApp(check: Check): Promise<void> {
	const photos = new RecordedDesignFilesGateway();
	const canvas = await openedCanvasOver(canvasPartsOver({ designFiles: photos }));
	const answer = await canvas.send(AddPhotosCommand, { photos: [new File(["x"], "a.png")] }, { idempotencyKey: "a" });
	check(
		"photos are written into the references of the app the canvas was opened on",
		[answer.ok, photos.added.length, photos.added.every((path) => path.includes("/Farm/"))],
		[true, 1, true],
	);
}

async function checkSidebarResize(check: Check): Promise<void> {
	const canvas = await openedCanvasOver(canvasPartsOver());
	const pxAfter = async (px: number, roomPx: number): Promise<unknown> => {
		await canvas.send(ResizeSidebarWidthCommand, { px, roomPx });
		const sidebar = await canvas.send(SidebarQuery);
		return sidebar.ok ? sidebar.output.px : sidebar.reason;
	};
	check(
		"a sidebar resize keeps its floor and leaves the board its room",
		[await pxAfter(40, 2000), await pxAfter(900, 1000), await pxAfter(240, 2000)],
		[160, 680, 240],
	);
}

async function checkMomentChangeReReads(check: Check): Promise<void> {
	const canvas = await openedCanvasOver(canvasPartsOver());
	const reRead = { opening: 0, mode: 0 };
	const stopOpening = canvas.routes.watch(CanvasOpeningQuery, undefined, () => (reRead.opening += 1));
	const stopMode = canvas.routes.watch(ModeQuery, undefined, () => (reRead.mode += 1));
	await canvas.send(FocusWidgetCommand, { widget: "@you/tasks" });
	await settled();
	const opening = await canvas.send(CanvasOpeningQuery);
	stopOpening();
	stopMode();
	check(
		"opening a widget turns the page, re-reads the opening the host keeps, and leaves the mode unread",
		[opening.ok && opening.output.page, reRead.opening > 0, reRead.mode],
		["Components", true, 0],
	);
}

function settled(): Promise<void> {
	return new Promise((done) => setTimeout(done, 0));
}

function heldFolder(): HeldFolder {
	const released = { release: (): void => undefined };
	const designed = new Promise<DrawnDesign>((done) => {
		released.release = () => done(DESIGN);
	});
	const folder = new FixedDesignFolderGateway(() => designed);
	return { folder, release: () => released.release() };
}

function checkLayerDrag(check: Check): void {
	const layerOf = (kind: CanvasLayer["kind"], isHeld: boolean): CanvasLayer => ({
		mark: kind,
		kind,
		name: kind,
		repeats: 1,
		isHeld,
		scope: "",
		children: [],
	});
	check(
		"a held layer never moves, and a locked layout moves only widgets",
		[
			canDragLayer(layerOf("row", true), false),
			canDragLayer(layerOf("row", false), true),
			canDragLayer(layerOf("widget", false), true),
			canDragLayer(layerOf("row", false), false),
		],
		[false, false, true, true],
	);
}

class RecordedDesignFilesGateway extends DesignFilesGateway {
	readonly added: string[] = [];

	override async exists(): Promise<boolean> {
		return true;
	}

	override async makeFolder(): Promise<void> {}

	override async writeBinary(path: string): Promise<void> {
		this.added.push(path);
	}

	override async writeText(): Promise<void> {}

	override async changeText(): Promise<void> {}
}

class BrokenSpecDesignFolderGateway extends FixedDesignFolderGateway {
	override async spec(): Promise<SpecRead> {
		return { refusal: "the front matter is broken" };
	}
}

class DoneJobsGateway extends AgentJobsGateway {
	override jobsOf(): readonly Job[] {
		return [DONE_JOB];
	}

	override liveJob(): LiveJob | null {
		return null;
	}

	override async stopJob(): Promise<void> {}

	override jobsChanged(): () => void {
		return () => undefined;
	}
}
