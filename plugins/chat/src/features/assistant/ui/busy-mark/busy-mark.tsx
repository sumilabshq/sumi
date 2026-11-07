import { createElement as h } from "react";
import type { ReactElement } from "react";
import { MascotFigure } from "../../../mascot/ui/mascot-figure/mascot-figure.js";

export interface BusyMarkProps {
	readonly state: "thinking" | "working";
}

const MARK_PX = 16;

export function BusyMark({ state }: BusyMarkProps): ReactElement {
	return <MascotFigure outfit="bare" size={MARK_PX} state={state} />;
}
