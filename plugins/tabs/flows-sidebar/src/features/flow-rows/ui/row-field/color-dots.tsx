import { createElement as h } from "react";
import type { ReactElement } from "react";
import { tooltipMarks } from "@widgetarium/kit";
import { GroupHueSchema } from "@widgetarium/navigation/contract";
import type { GroupHue } from "@widgetarium/navigation/contract";

export interface ColorChoice {
	readonly value: GroupHue | null;
	readonly onPick: (color: GroupHue | null) => void;
}

export interface ColorDotsProps {
	readonly choice: ColorChoice;
}

const COLORS_LABEL = "Folder color";
const NO_COLOR = "No color";
const COLORS: readonly (GroupHue | null)[] = [null, ...GroupHueSchema.options];

export function ColorDots({ choice }: ColorDotsProps): ReactElement {
	return (
		<div className="sumi-flows-picker-colors" role="radiogroup" aria-label={COLORS_LABEL}>
			{COLORS.map((color) => (
				<button
					key={color ?? NO_COLOR}
					type="button"
					role="radio"
					className="sumi-flows-picker-color"
					data-color={color ?? undefined}
					aria-label={color ?? NO_COLOR}
					{...tooltipMarks({ said: color ?? NO_COLOR })}
					aria-checked={choice.value === color}
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => choice.onPick(color)}
				/>
			))}
		</div>
	);
}
