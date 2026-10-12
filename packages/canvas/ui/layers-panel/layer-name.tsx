import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Tip } from "../tip/tip.js";

const HELD_SAID = "Handed to a component as a prop, so it stays where it is";

export function LayerName({ title, isHeld }: { readonly title: string; readonly isHeld: boolean }): ReactElement {
	const name = <span className="cv:overflow-hidden cv:text-ellipsis">{title}</span>;
	return isHeld ? <Tip label={HELD_SAID}>{name}</Tip> : name;
}
