import { boardIn } from "./board-in-note.js";
import { textAt } from "./text-at.js";
import type { ReadingAdapter } from "./text-at.js";
import type { Board } from "@widgetarium/core/model.js";
import { screenPathOf, vaultBindingOf } from "@widgetarium/core/app-design.js";
import type { ScreenState } from "@widgetarium/core/app-design.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { mountSpecsOf } from "@widgetarium/core/manifest-holds.js";
import type { SlotState } from "@widgetarium/core/gateway/declared-types.js";
import type { WidgetLookup } from "@widgetarium/core/registry.js";
import { statePropsOf } from "../../schema/design.schema.js";
import type { DrawnState, MountPicture, StatePicture } from "../../schema/design.schema.js";

type Lookup = Pick<WidgetLookup, "get">;

export interface DrawnStateSource {
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

export function statePictureOf(
	registry: Lookup,
	widget: string,
	props: Readonly<Record<string, unknown>>,
): StatePicture {
	return { widget, props, mounts: mountsOf(registry, widget, props) };
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

function mountsOf(
	registry: Lookup,
	widget: string,
	props: Readonly<Record<string, unknown>>,
): Readonly<Record<string, readonly MountPicture[]>> | null {
	const slots = Object.keys(mountSpecsOf(registry.get(widget)?.manifest));
	if (slots.length === 0) return null;
	return Object.fromEntries(
		slots.map((name) => [name, slotStatesIn(props[name]).map((one, at) => mountPictureOf(registry, one, at))]),
	);
}

function slotStatesIn(held: unknown): SlotState[] {
	const listed = Array.isArray(held) ? held : held === undefined || held === null ? [] : [held];
	return listed.filter(isSlotState);
}

function isSlotState(held: unknown): held is SlotState {
	return isObject(held) && typeof held["widget"] === "string";
}

function mountPictureOf(registry: Lookup, one: SlotState, at: number): MountPicture {
	const definition = registry.get(one.widget);
	const props = { ...(statePropsOf(definition?.states ?? {}, one.state) ?? {}), ...one.props };
	const title = definition?.manifest["title"];
	return {
		name: `${one.widget}#${at}`,
		widget: one.widget,
		title: typeof title === "string" ? title : one.widget,
		surface: one.surface ?? null,
		picture: statePictureOf(registry, one.widget, props),
	};
}
