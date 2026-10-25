import { createElement as h } from "react";
import type { ReactElement } from "react";

const NOT_AVAILABLE = "The terminal runs only in the desktop app.";

export function TerminalUnavailable(): ReactElement {
	return <p className="wg-terminal-note">{NOT_AVAILABLE}</p>;
}
