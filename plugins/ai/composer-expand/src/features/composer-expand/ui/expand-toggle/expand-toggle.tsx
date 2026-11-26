import { createElement as h } from "react";
import type { ReactElement, RefObject } from "react";
import { Icon, PartButton, tooltipMarks } from "@widgetarium/kit";
import { useExpanding } from "../../lib/expanding-context.js";
import { useGlidesComposer } from "../../lib/use-glides-composer.js";

export interface ExpandToggleProps {
	readonly composer: RefObject<HTMLDivElement | null>;
	readonly box: RefObject<HTMLTextAreaElement | null>;
	readonly fitBox: () => void;
}

const EXPAND = "Expand the message box";
const COLLAPSE = "Collapse the message box";
const NO_FRAME: RefObject<HTMLDivElement | null> = {
	current: null,
};

export function ExpandToggle({ composer, box, fitBox }: ExpandToggleProps): ReactElement | null {
	const expanding = useExpanding();
	const isExpanded = expanding?.isExpanded ?? false;
	const measureComposer = useGlidesComposer({
		composer,
		box,
		isExpanded,
		fitBox,
		frame: expanding?.frame ?? NO_FRAME,
	});

	if (expanding === null) {
		return null;
	}

	const said = isExpanded ? COLLAPSE : EXPAND;
	return (
		<PartButton
			className="sumi-composer-expand-toggle"
			label={said}
			aria-pressed={isExpanded}
			onMouseDown={(event) => event.preventDefault()}
			onClick={() => {
				measureComposer();
				expanding.setExpanded(!isExpanded);
			}}
			{...tooltipMarks({ said, side: "top" })}
		>
			<Icon name={isExpanded ? "corners-in" : "corners-out"} size={16} />
		</PartButton>
	);
}
