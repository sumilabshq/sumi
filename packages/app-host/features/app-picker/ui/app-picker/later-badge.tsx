import { createElement as h } from "react";
import type { ReactElement } from "react";

const LATER = "Later";
const BADGE =
	"cv:inline-flex cv:h-[22px] cv:flex-none cv:items-center cv:rounded-full cv:bg-fill cv:px-2 cv:text-[11px] cv:font-medium cv:text-muted-foreground";

export function LaterBadge(): ReactElement {
	return <span className={BADGE}>{LATER}</span>;
}
