import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import type { Starter } from "../../../../shared/schema/starter.schema.js";

export interface StarterChipProps {
	readonly starter: Starter;
	readonly onDrop: () => void;
}

export const STARTER_FACES: Readonly<
	Record<Starter, { readonly icon: string; readonly label: string; readonly asks: string }>
> = {
	create: {
		icon: "code-xml",
		label: "Create an app",
		asks: "What should the app do, and for whom?",
	},
	design: {
		icon: "layout-panel-left",
		label: "Design the app",
		asks: "Which screens, and how should they feel?",
	},
};

const REMOVE = "Remove {label}";

export function StarterChip({ starter, onDrop }: StarterChipProps): ReactElement {
	const face = STARTER_FACES[starter];
	return (
		<span className="wg-studio-ai-starter-chip" data-starter-chip={starter}>
			<Icon name={face.icon} size={15} />
			{face.label}
			<button type="button" aria-label={REMOVE.replace("{label}", face.label)} onClick={onDrop}>
				<Icon name="x" size={12} />
			</button>
		</span>
	);
}
