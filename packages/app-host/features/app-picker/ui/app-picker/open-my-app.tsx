import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { PickerApp } from "../../contract.js";

const OPEN = "Open";
const OPEN_PILL =
	"cv:inline-flex cv:h-10 cv:flex-none cv:items-center cv:rounded-full cv:border-0 cv:bg-fill cv:px-4 cv:text-[13px] cv:font-medium cv:text-muted-foreground cv:shadow-none";

export function OpenMyApp({ app }: { readonly app: PickerApp }): ReactElement {
	// TODO: open a project as a host tab; app-host has no tab kind for it yet
	return (
		<button type="button" className={OPEN_PILL} disabled data-host-picker-open={app.id}>
			{OPEN}
		</button>
	);
}
