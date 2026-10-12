import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import { Contained } from "@widgetarium/core/catalogue-contained.js";
import { leaseFor } from "@widgetarium/core/engine/render.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { mountSpecsOf } from "@widgetarium/core/manifest-holds.js";
import type { MountEntry } from "@widgetarium/core";
import type { SlotState } from "@widgetarium/core/gateway/declared-types.js";
import { statePropsOf } from "../../schemas/design.schema.js";
import type { StatePicture } from "../../schemas/design.schema.js";
import type { Drawing } from "../../schemas/drawing.schema.js";
import { RefusedDrawing } from "./refused-drawing.js";

type Registry = Drawing["registry"];

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
	const instead = (failure: unknown): ReactElement => (
		<RefusedDrawing
			said={FAILED.replace("{widget}", picture.widget).replace(
				"{why}",
				failure instanceof Error ? failure.message : String(failure),
			)}
			failure={failure}
		/>
	);
	return (
		<Contained instead={instead}>
			<div className="wg-studio-drawn cv:@container cv:min-w-0 cv:[--wg-gap-cards:8px] cv:[--wg-gap-items:16px] cv:[--wg-gap-parts:8px]">
				{h(component, props)}
			</div>
		</Contained>
	);
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
	const drawn = <StateDrawing picture={{ widget: one.widget, props }} registry={registry} />;
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
			lease.draw(drawn);
			return lease.release;
		},
		drawInline: () => drawn,
	};
}

function refused(said: string): ReactElement {
	return <RefusedDrawing said={said} failure={said} />;
}
