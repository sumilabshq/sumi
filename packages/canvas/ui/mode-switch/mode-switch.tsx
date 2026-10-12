import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Segmented } from "@widgetarium/kit";
import type { InjectProps } from "@widgetarium/core";
import type { CanvasMode } from "../../schemas/canvas-view.schema.js";
import type { modeSwitchInject } from "../../widgets/mode-switch.widget.js";
import { Tip } from "../tip/tip.js";

const MODES: readonly { readonly value: CanvasMode; readonly icon: string; readonly said: string }[] = [
	{ value: "pointer", icon: "mouse-pointer-2", said: "Select: point at a part of a page to pick it" },
	{ value: "hand", icon: "hand", said: "Hand: drag to move around the canvas" },
];

export function ModeSwitch({ getMode, setMode }: InjectProps<typeof modeSwitchInject>): ReactElement {
	return (
		<>
			<Segmented<CanvasMode>
				items={MODES.map((one) => ({
					value: one.value,
					label: (
						<Tip label={one.said}>
							<Icon name={one.icon} size={16} />
						</Tip>
					),
				}))}
				value={getMode}
				onValueChange={(mode) => void setMode({ mode })}
				size="s"
				className="cv:rounded-full cv:bg-page cv:shadow-[0_0_0_1px_var(--wg-kit-card-edge)]"
			/>
		</>
	);
}
