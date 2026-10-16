import { boardIn } from "../../../features/shots/lib/design/board-in-note.js";
import { textAt } from "./text-at.js";
import type { ReadingAdapter } from "./text-at.js";
import type { Board } from "@widgetarium/core/model.js";
import { screenPathOf, vaultBindingOf } from "@widgetarium/core/app-design.js";
import type { ScreenState } from "@widgetarium/core/app-design.js";
import type { WidgetLookup } from "@widgetarium/core/registry.js";
import { statePropsOf } from "../../../shared/schema/design.schema.js";
import type { DrawnState, StatePicture } from "../../../shared/schema/design.schema.js";
import { statePictureOf } from "../../../shared/lib/design/state-picture.js";

type Lookup = Pick<WidgetLookup, "get">;

interface DrawnStateSource {
	readonly adapter: ReadingAdapter;
	readonly registry: Lookup;
}

const NO_BOARD = "{name} holds no widgetarium board";
const NO_FILE = "{name} does not exist";
const BOARD_REFUSED = "{name}: {why}";
const BOUND_TO_VAULT =
	"{name} reads the vault ({binding}): a design is drawn from sample rows only. Ask the agent to redraw it.";

export async function readDrawnState(
	source: DrawnStateSource,
	app: string,
	state: ScreenState,
	screen: string,
): Promise<DrawnState> {
	const board = await boardAt(source, app, state.file);
	if (typeof board === "string") return { name: state.name, board: null, refusal: board };
	const picture = pictureOf(source, board, state.name === screen ? null : state.name);
	if (picture) return { name: state.name, board, picture };
	const binding = vaultBindingOf(board);
	if (!binding) return { name: state.name, board };
	const refusal = BOUND_TO_VAULT.replace("{name}", state.file).replace("{binding}", binding);
	return { name: state.name, board: null, refusal };
}

async function boardAt(source: DrawnStateSource, app: string, file: string): Promise<Board | string> {
	const held = await textAt(source.adapter, screenPathOf(app, file));
	if (held.kind === "refused") return held.refusal;
	if (held.kind === "absent") return NO_FILE.replace("{name}", file);
	const read = boardIn(held.text);
	if (read.kind === "board") return read.board;
	if (read.kind === "none") return NO_BOARD.replace("{name}", file);
	return BOARD_REFUSED.replace("{name}", file).replace("{why}", read.refusal);
}

function pictureOf(source: DrawnStateSource, board: Board, state: string | null): StatePicture | null {
	const [tile] = board.tiles;
	if (!tile || board.tiles.length > 1) return null;
	const props = statePropsOf(source.registry.get(tile.widget)?.states ?? {}, state);
	return props ? statePictureOf(source.registry, tile.widget, props) : null;
}
