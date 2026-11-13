import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SumiFigure } from "@sumi/sumi-host-plugin";

const MARK_PX = 14;

export function BusyMark(): ReactElement {
	return <SumiFigure state="working" size={MARK_PX} />;
}
