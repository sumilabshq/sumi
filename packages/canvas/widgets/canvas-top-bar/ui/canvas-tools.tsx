import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Segmented } from "@widgetarium/kit";
import type { CanvasMode } from "../../../schemas/canvas-view.schema.js";
import { AddPhoto } from "./add-photo.js";
import { Tip } from "../../canvas-ui/tip.js";

export interface CanvasToolsProps {
	readonly mode: CanvasMode;
	readonly onMode: (mode: CanvasMode) => void;
	readonly onAddPhotos: (photos: readonly File[]) => void;
}

const MODES: readonly { readonly value: CanvasMode; readonly icon: string; readonly said: string }[] = [
	{ value: "pointer", icon: "mouse-pointer-2", said: "Select: point at a part of a page to pick it" },
	{ value: "hand", icon: "hand", said: "Hand: drag to move around the canvas" },
];

export function CanvasTools({ mode, onMode, onAddPhotos }: CanvasToolsProps): ReactElement {
	return (
		<div className="cv:flex cv:items-center cv:gap-1.5">
			<AddPhoto onAddPhotos={onAddPhotos} />
			<Segmented<CanvasMode>
				items={MODES.map((one) => ({
					value: one.value,
					label: (
						<Tip label={one.said}>
							<Icon name={one.icon} size={16} />
						</Tip>
					),
				}))}
				value={mode}
				onValueChange={onMode}
				size="s"
				className="cv:rounded-full cv:bg-page cv:shadow-[0_0_0_1px_var(--wg-kit-card-edge)]"
			/>
		</div>
	);
}
