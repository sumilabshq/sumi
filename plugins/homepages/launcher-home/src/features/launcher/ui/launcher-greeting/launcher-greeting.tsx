import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SumiFigure } from "@sumi/sumi-host-plugin";

const QUESTION = "Where to?";
const MASCOT_PX = 96;

export function LauncherGreeting(): ReactElement {
	return (
		<div className="sumi-launcher-greeting">
			<SumiFigure state="rest" size={MASCOT_PX} />
			<h1 className="sumi-launcher-question">{QUESTION}</h1>
		</div>
	);
}
