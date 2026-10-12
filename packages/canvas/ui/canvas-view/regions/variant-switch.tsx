import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import type { CanvasPages } from "../../../schemas/canvas-page.schema.js";

export interface VariantSwitchProps {
	readonly variants: CanvasPages["variants"];
	readonly shown: string;
	readonly onVariant: (screen: string) => void;
}

const PICKED = "Picked";

export function VariantSwitch({ variants, shown, onVariant }: VariantSwitchProps): ReactElement | null {
	if (variants.length < 2) return null;
	return (
		<Segmented<string>
			size="m"
			items={variants.map(({ screen, letter }) => ({ value: screen, label: letter ?? PICKED }))}
			value={shown}
			onValueChange={onVariant}
			className="cv:[zoom:2]"
		/>
	);
}
