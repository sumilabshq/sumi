import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SumiFigure } from "@sumi/sumi-host-plugin";
import { Button } from "@widgetarium/kit";

export interface AskInkButtonProps {
	readonly label: string;
	readonly onPress: () => void;
}

const ASK = "cv:h-12 cv:gap-2 cv:ps-2.5 cv:pe-5 cv:text-[14px] cv:font-medium";
const INK = "cv:me-0.5 cv:flex-none";
const INK_PX = 20;

export function AskInkButton({ label, onPress }: AskInkButtonProps): ReactElement {
	return (
		<Button variant="wash" className={ASK} onClick={onPress} data-browser-ask-ink="">
			<span className={INK}>
				<SumiFigure state="rest" size={INK_PX} />
			</span>
			{label}
		</Button>
	);
}
