import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import { Contained } from "@widgetarium/core/catalogue-contained.js";
import { leaseFor } from "@widgetarium/core/engine/render.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { mountSpecsOf } from "@widgetarium/core/manifest-holds.js";
import type { MountEntry } from "@widgetarium/core/gateway/host.js";
import type { SlotState } from "@widgetarium/core/gateway/declared-types.js";
import type { WidgetSurfaceProps } from "@widgetarium/core/surface/widget-surface.js";
import type { StatePicture } from "@widgetarium/core/engine/design-port.js";
import { RefusedDrawing } from "./draw-failure.js";

export type { StatePicture };

type Registry = WidgetSurfaceProps["registry"];

export interface StateDrawingProps {
	readonly registry: Registry;
	readonly picture: StatePicture;
}

const NOT_BUILT = "{widget} is not built yet";
const FAILED = "{widget} failed to draw this state: {why}";

export function StateDrawing({ picture, registry }: StateDrawingProps): ReactElement {
	const mounts = useMemo(() => mountsOf(picture, registry), [picture, registry]);
	const given = isObject(picture.props) ? picture.props : {};
	const props = mounts === null ? given : { ...given, mounts };
	const component = registry.get(picture.widget)?.component;
	if (!component) return refused(NOT_BUILT.replace("{widget}", picture.widget));
	const instead = (failure: unknown): ReactElement =>
		h(RefusedDrawing, {
			said: FAILED.replace("{widget}", picture.widget).replace(
				"{why}",
				failure instanceof Error ? failure.message : String(failure),
			),
			failure,
		});
	return h(Contained, { instead }, h("div", { className: "wg-studio-drawn" }, h(component, props)));
}

export function statePropsOf<Props>(
	states: Readonly<Record<string, Props>>,
	state: string | null | undefined,
): Props | undefined {
	const [first] = Object.keys(states);
	return states[state ?? first ?? ""];
}

function mountsOf(picture: StatePicture, registry: Registry): Readonly<Record<string, MountEntry[]>> | null {
	const props = isObject(picture.props) ? picture.props : {};
	const slots = Object.keys(mountSpecsOf(registry.get(picture.widget)?.manifest));
	if (slots.length === 0) return null;
	return Object.fromEntries(
		slots.map((name) => [name, slotStatesIn(props[name]).map((one, at) => entryOf(one, at, registry))]),
	);
}

function slotStatesIn(held: unknown): SlotState[] {
	const listed = Array.isArray(held) ? held : held === undefined || held === null ? [] : [held];
	return listed.filter(isSlotState);
}

function isSlotState(held: unknown): held is SlotState {
	return isObject(held) && typeof held["widget"] === "string";
}

function entryOf(one: SlotState, at: number, registry: Registry): MountEntry {
	const definition = registry.get(one.widget);
	const props = { ...(statePropsOf(definition?.states ?? {}, one.state) ?? {}), ...one.props };
	const title = definition?.manifest["title"];
	return {
		name: `${one.widget}#${at}`,
		id: one.widget,
		hidden: false,
		title: typeof title === "string" ? title : one.widget,
		manifest: definition?.manifest ?? null,
		problem: definition?.component ? null : "not-found",
		failure: definition?.component ? null : NOT_BUILT.replace("{widget}", one.widget),
		surface: one.surface ?? null,
		height: null,
		drawInto: (element) => {
			const lease = leaseFor(element);
			lease.draw(h(StateDrawing, { picture: { widget: one.widget, props }, registry }));
			return lease.release;
		},
		drawInline: () => h(StateDrawing, { picture: { widget: one.widget, props }, registry }),
	};
}

function refused(said: string): ReactElement {
	return h(RefusedDrawing, { said, failure: said });
}
