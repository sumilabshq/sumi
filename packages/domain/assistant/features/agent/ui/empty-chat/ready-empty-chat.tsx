import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Mascot } from "@widgetarium/mascot";

const GREETING = "What are we building?";
const SUB = "Ink makes apps on this computer, in a folder you choose.";
const MASCOT_PX = 120;

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
