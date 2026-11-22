import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Mascot } from "../../../mascot/ui/mascot/mascot.js";

const QUESTION = "What are we building?";
const MASCOT_PX = 168;

export function ReadyEmptyChat(): ReactElement {
	return (
		<div className="wg-studio-ai-welcome">
			<Mascot size={MASCOT_PX} />
			<h2 className="wg-studio-ai-greet">{QUESTION}</h2>
		</div>
	);
}
