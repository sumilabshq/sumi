import { createElement as h } from "react";
import type { ReactElement } from "react";
import { StatusCube } from "@widgetarium/kit";

const MARK_PX = 14;

export function BusyMark(): ReactElement {
	return <StatusCube state="working" size={MARK_PX} />;
}
