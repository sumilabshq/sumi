import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import { Contained } from "@widgetarium/core/catalogue-contained.js";
import { leaseFor } from "@widgetarium/core/engine/render.js";
import type { MountEntry } from "@widgetarium/core";
import type { MountPicture, StatePicture } from "../../schema/design.schema.js";
import type { Drawing } from "../../schema/drawing.schema.js";
import { RefusedDrawing } from "./refused-drawing.js";

type Registry = Drawing["registry"];

export interface StateDrawingProps {
	readonly registry: Registry;
	readonly picture: StatePicture;
}

const NOT_BUILT = "{widget} is not built yet";
const FAILED = "{widget} failed to draw this state: {why}";

export function StateDrawing({ picture, registry }: StateDrawingProps): ReactElement {
	const mounts = useMemo(() => mountEntriesOf(picture, registry), [picture, registry]);
	const props = mounts === null ? picture.props : { ...picture.props, mounts };
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

function mountEntriesOf(picture: StatePicture, registry: Registry): Readonly<Record<string, MountEntry[]>> | null {
	if (picture.mounts === null) return null;
	return Object.fromEntries(
		Object.entries(picture.mounts).map(([name, mounted]) => [name, mounted.map((one) => entryOf(one, registry))]),
	);
}

function entryOf(mounted: MountPicture, registry: Registry): MountEntry {
	const definition = registry.get(mounted.widget);
	const drawn = <StateDrawing picture={mounted.picture} registry={registry} />;
	return {
		name: mounted.name,
		id: mounted.widget,
		hidden: false,
		title: mounted.title,
		manifest: definition?.manifest ?? null,
		problem: definition?.component ? null : "not-found",
		failure: definition?.component ? null : NOT_BUILT.replace("{widget}", mounted.widget),
		surface: mounted.surface,
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
