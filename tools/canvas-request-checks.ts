import type { SpecRead } from "../packages/core/src/app-spec.ts";
import { CanvasHost, DesignFilesGateway, detachedHostOf } from "../packages/canvas/generated/gateways.ts";
import type { ReturnTo } from "../packages/canvas/generated/gateways.ts";
import { PageChoicesQuery, ReturnToViewCommand } from "../packages/canvas/features/pages/contract.ts";
import { PickVariantCommandHandler, ShowPageCommandHandler } from "../packages/canvas/features/pages/handlers.ts";
import { PastePhotosCommand } from "../packages/canvas/features/photos/contract.ts";
import { CachedDesignReads } from "../packages/canvas/shared/lib/design/design-reads.ts";
import { MomentCanvasStore } from "../packages/canvas/shared/lib/view/canvas-store.ts";
import { WebDesignFilesGateway } from "../packages/canvas/gateways/design-files/web.gateway.ts";
import { WebAgentJobsGateway } from "../packages/canvas/gateways/agent-jobs/web.gateway.ts";
import type { DrawnDesign } from "../packages/canvas/shared/schema/design.schema.ts";
import { FARM_OPENED, FixedDesignFolderGateway, canvasAppOver, canvasPartsOver } from "./canvas-hosts.ts";

type Check = (what: string, held: unknown, wanted: unknown) => void;

interface HeldFolder {
	readonly folder: FixedDesignFolderGateway;
	readonly release: () => void;
	readonly watching: { started: number; stopped: number };
}

const DESIGN: DrawnDesign = {
	screens: [
		{ name: "Home", states: [] },
		{ name: "Other", states: [] },
	],
	references: [],
	widgets: [],
};

class RecordedDesignFilesGateway extends DesignFilesGateway {
	readonly added: string[] = [];

	override async exists(): Promise<boolean> {
		return true;
	}

	override async read(): Promise<null> {
		return null;
	}

	override async makeFolder(): Promise<void> {}

	override async writeBinary(path: string): Promise<void> {
		this.added.push(path);
	}

	override async writeText(): Promise<void> {}

	override async changeText(): Promise<void> {}
}

class BrokenSpecDesignFolderGateway extends FixedDesignFolderGateway {
	override async readSpec(): Promise<SpecRead> {
		return { refusal: "the front matter is broken" };
	}
}

class RecordingCanvasStore extends MomentCanvasStore {
	readonly reasons: string[] = [];

	override change(...[next, reason]: Parameters<MomentCanvasStore["change"]>): boolean {
		this.reasons.push(reason);
		return super.change(next, reason);
	}

	override changeOpening(...[next, reason]: Parameters<MomentCanvasStore["changeOpening"]>): boolean {
		this.reasons.push(reason);
		return super.changeOpening(next, reason);
	}
}

export async function checkCanvasRequests(check: Check): Promise<void> {
	await checkPickAfterPageTurn(check);
	await checkWatchStopsOnce(check);
	await checkPasteOwner(check);
	await checkProjectWithNoDesignFolder(check);
	await checkReturnTo(check);
	checkOpensInHand(check);
}

function checkOpensInHand(check: Check): void {
	const fresh = new MomentCanvasStore(FARM_OPENED, () => undefined);
	const keptPointer = new MomentCanvasStore({ ...FARM_OPENED, mode: "pointer" }, () => undefined);
	check(
		"a canvas opens in hand mode, fresh and from a kept opening that says pointer",
		[fresh.now().mode, keptPointer.now().mode],
		["hand", "hand"],
	);
}

async function checkReturnTo(check: Check): Promise<void> {
	const opened: string[] = [];
	const returnOver = (returnTo: ReturnTo) =>
		canvasAppOver(
			canvasPartsOver(
				{ opened: FARM_OPENED },
				{
					designFolderGateway: new BrokenSpecDesignFolderGateway(async () => DESIGN),
					canvasHost: new CanvasHost({ ...detachedHostOf(FARM_OPENED), returnTo }),
				},
			),
		).send(ReturnToViewCommand);
	const toView = await returnOver({ kind: "view", open: async () => void opened.push("view") });
	check(
		"a host that returns to its own view goes back without reading the spec",
		[toView.ok, opened],
		[true, ["view"]],
	);
	const toNote = await returnOver({ kind: "note", open: async (note) => void opened.push(`note ${note}`) });
	check(
		"a host that returns to a note refuses a spec it cannot read, before opening anything",
		[toNote.ok ? null : [toNote.code, toNote.ran], opened],
		[["refused", false], ["view"]],
	);
}

async function checkProjectWithNoDesignFolder(check: Check): Promise<void> {
	const choices = await canvasAppOver(canvasPartsOver({ opened: { ...FARM_OPENED, page: "" } })).send(PageChoicesQuery);
	check(
		"a canvas over a project with no design folder reads the project's design",
		choices.ok ? choices.output.groups : choices.reason,
		[["Pages"], ["Components"]],
	);
}

async function checkPickAfterPageTurn(check: Check): Promise<void> {
	const held = heldFolder();
	const canvasStore = new RecordingCanvasStore(FARM_OPENED, () => undefined);
	const designReads = new CachedDesignReads(held.folder, new WebAgentJobsGateway(), new WebDesignFilesGateway());
	const picking = PickVariantCommandHandler.handle({ screen: "Home B" }, { designReads, canvasStore });
	ShowPageCommandHandler.handle({ page: "Other" }, { canvasStore });
	held.release();
	await picking;
	check("a variant pick whose page turned while the design was read writes nothing", canvasStore.reasons, [
		"show Other",
	]);
}

async function checkWatchStopsOnce(check: Check): Promise<void> {
	const held = heldFolder();
	const canvas = canvasAppOver(canvasPartsOver({ opened: FARM_OPENED }, { designFolderGateway: held.folder }));
	const stopFirst = canvas.watches.watch(PageChoicesQuery, undefined);
	stopFirst();
	const stopSecond = canvas.watches.watch(PageChoicesQuery, undefined);
	stopFirst();
	check("a watch stopped twice stops its own watch once and leaves the next one", held.watching, {
		started: 2,
		stopped: 1,
	});
	stopSecond();
}

async function checkPasteOwner(check: Check): Promise<void> {
	const photos = new RecordedDesignFilesGateway();
	const owner = { isOwner: false };
	const parts = canvasPartsOver(
		{ opened: FARM_OPENED, ownsPaste: () => owner.isOwner },
		{ designFilesGateway: photos },
	);
	const canvas = canvasAppOver(parts);
	const photo = new File(["x"], "a.png");
	const elsewhere = await canvas.send(PastePhotosCommand, { photos: [photo] }, { idempotencyKey: "elsewhere" });
	owner.isOwner = true;
	const here = await canvas.send(PastePhotosCommand, { photos: [photo] }, { idempotencyKey: "here" });
	check(
		"a paste the host does not own writes nothing into the design; one it owns does",
		[elsewhere.ok && elsewhere.output.isTaken, here.ok && here.output.isTaken, photos.added.length],
		[false, true, 1],
	);
}

function heldFolder(): HeldFolder {
	const released = { release: (): void => undefined };
	const designed = new Promise<DrawnDesign>((done) => {
		released.release = () => done(DESIGN);
	});
	const watching = { started: 0, stopped: 0 };
	const folder = new FixedDesignFolderGateway(
		() => designed,
		() => {
			watching.started += 1;
			return () => void (watching.stopped += 1);
		},
	);
	return { folder, release: () => released.release(), watching };
}
