import { isObject } from "@widgetarium/core/engine/is-object.js";
import { mountSpecsOf } from "@widgetarium/core/manifest-holds.js";
import type { SlotState } from "@widgetarium/core/gateway/declared-types.js";
import type { WidgetLookup } from "@widgetarium/core/registry.js";
import { statePropsOf } from "./state-props.js";
import type { MountPicture, StatePicture } from "../../schema/state-picture.schema.js";

type Lookup = Pick<WidgetLookup, "get">;

export function statePictureOf(
	registry: Lookup,
	widget: string,
	props: Readonly<Record<string, unknown>>,
): StatePicture {
	return { widget, props, mounts: mountsOf(registry, widget, props) };
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
