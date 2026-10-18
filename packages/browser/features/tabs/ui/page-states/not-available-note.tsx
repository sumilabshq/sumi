import { createElement as h } from "react";
import type { ReactElement } from "react";

const NOTE =
	"cv:absolute cv:inset-0 cv:grid cv:place-items-center cv:p-6 cv:text-center cv:text-sm cv:text-muted-foreground";
const NOT_AVAILABLE = "The browser opens pages only inside the Obsidian desktop app.";

export function NotAvailableNote(): ReactElement {
	return <p className={NOTE}>{NOT_AVAILABLE}</p>;
}
