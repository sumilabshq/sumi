import type { App, DataAdapter } from "obsidian";
import { screenPathOf } from "../packages/core/src/app-design.ts";
import { sourceKeyOf } from "../packages/core/src/engine/node-marks.ts";
import type { WidgetRegistry } from "../packages/core/src/registry.ts";
import { layerMoved } from "../packages/canvas/ports/obsidian/design-writes.ts";
import { boardIn } from "../packages/canvas/requests/design/board-in-note.ts";
import { readDrawnState } from "../packages/canvas/requests/design/drawn-state.ts";
import { standIn } from "./stand-in.ts";

type Check = (what: string, held: unknown, wanted: unknown) => void;

const BOARD_NOTE = "```widgetarium\nv: 2\nlayout: { dir: column, of: [] }\n```\n";
const BROKEN_NOTE = "```widgetarium\nlayout: [\n```\n";
const PAGE = `const P = createWidget({
	draw: () => (
		<Page>
			<div data-name="Main">
				<ReachOut />
			</div>
			<aside data-name="Side">
				<Birthdays />
			</aside>
		</Page>
	),
});
`;
const STALE_PAGE = `${PAGE}export const stale = 1;\n`;

export async function checkCanvasReads(check: Check): Promise<void> {
	checkBoardIn(check);
	await checkDrawnStateReads(check);
	await checkLayerMoveWritesWhatItRead(check);
}

function checkBoardIn(check: Check): void {
	const broken = boardIn(BROKEN_NOTE);
	check(
		"a note tells a board, no block and an unreadable block apart",
		[boardIn(BOARD_NOTE).kind, boardIn("# plain").kind, broken.kind, "refusal" in broken],
		["board", "none", "refused", true],
	);
}

async function checkDrawnStateReads(check: Check): Promise<void> {
	const files = new Map([[screenPathOf("Farm", "broken.md"), BROKEN_NOTE]]);
	const adapter = {
		read: async (path: string): Promise<string> => {
			const text = files.get(path);
			if (text === undefined) throw new Error(path.endsWith("locked.md") ? "EIO: the disk refused" : "ENOENT");
			return text;
		},
		exists: async (path: string): Promise<boolean> => files.has(path) || path.endsWith("locked.md"),
	};
	const source = { adapter, registry: { get: () => null } };
	const refusalOf = async (file: string): Promise<string> =>
		(await readDrawnState(source, "Farm", { name: "Home", file }, "Home")).refusal ?? "";
	check(
		"a screen file that is missing, unreadable or holding a broken board each says which, never no board",
		[
			await refusalOf("gone.md"),
			(await refusalOf("locked.md")).includes("could not be read: EIO: the disk refused"),
			(await refusalOf("broken.md")).includes("its widgetarium block cannot be read"),
		],
		["gone.md does not exist", true, true],
	);
}

async function checkLayerMoveWritesWhatItRead(check: Check): Promise<void> {
	const path = "W/widget.tsx";
	const files = new Map([[path, PAGE]]);
	const adapter = {
		read: async (): Promise<string> => STALE_PAGE,
		write: async (): Promise<void> => undefined,
		process: async (at: string, change: (text: string) => string): Promise<string> => {
			const changed = change(files.get(at) ?? "");
			files.set(at, changed);
			return changed;
		},
	};
	const obsidian = standIn<App>(
		{ vault: { adapter: standIn<DataAdapter>(adapter, ["process"], "adapter") } },
		["vault"],
		"app",
	);
	const registry = standIn<WidgetRegistry>({ get: () => ({ folder: "W" }) }, ["get"], "registry");
	const moveOn = (text: string) => ({
		file: "widget.tsx",
		sourceKey: sourceKeyOf(text),
		from: text.indexOf("<ReachOut"),
		into: text.indexOf("<aside"),
		before: null,
	});
	const answerOf = (text: string): Promise<string> =>
		layerMoved(obsidian, registry, "w", moveOn(text)).then(
			() => "moved",
			(failure: unknown) => (failure instanceof Error ? failure.message : String(failure)),
		);
	const stale = await answerOf(STALE_PAGE);
	check(
		"a layer move judged against an older file is refused inside the write and leaves the file alone",
		[stale.startsWith("Nothing was moved"), files.get(path) === PAGE],
		[true, true],
	);
	const current = await answerOf(PAGE);
	const moved = files.get(path) ?? "";
	check(
		"and one made against the file as written lands, read and written in one step",
		[current, moved.indexOf("<ReachOut") > moved.indexOf("<aside")],
		["moved", true],
	);
}
