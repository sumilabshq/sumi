import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Mascot } from "../../../mascot/ui/mascot/mascot.js";

const GREETING = "What are we building?";
const SUB = "Sumi makes apps on this computer, in a folder you choose.";
const MASCOT_PX = 64;

export function ReadyEmptyChat({ starters }: { readonly starters: ReactNode }): ReactElement {
	return (
		<div className="wg-studio-ai-welcome">
			<Mascot size={MASCOT_PX} />
			<h2 className="wg-studio-ai-greet">{GREETING}</h2>
			<p className="wg-studio-ai-greet-said">{SUB}</p>
			{starters}
		</div>
	);
}
