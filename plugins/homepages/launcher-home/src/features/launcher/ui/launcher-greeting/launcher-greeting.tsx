import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SumiFigure } from "@sumi/sumi-host-plugin";

const QUESTION = "What are we building?";
const MASCOT_PX = 40;

export function LauncherGreeting(): ReactElement {
	return (
		<div className="sumi-launcher-greeting">
			<SumiFigure state="rest" size={MASCOT_PX} />
			<h2 className="sumi-launcher-question">{QUESTION}</h2>
		</div>
	);
}
