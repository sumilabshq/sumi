import { createElement as h } from "react";
import type { ReactElement } from "react";

const NOTHING_FOUND = "Nothing matches";

export function LookNone(): ReactElement {
	return <p className="wg-ws-pick-none">{NOTHING_FOUND}</p>;
}
