import { createElement as h } from "react";
import type { ReactElement } from "react";

const NONE = "none";

export function NoneSaid(): ReactElement {
	return <span className="wg-tasks-t3">{NONE}</span>;
}
