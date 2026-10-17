import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Tip } from "@widgetarium/canvas";
import { useCommand } from "@widgetarium/core/requests";
import { Icon } from "@widgetarium/kit";
import { ALL_TABS_LEAVES } from "../../../../shared/lib/host-bar-steps/host-bar-steps.js";
import { ToggleColumnCommand } from "../../contract.js";

const SHOW_TABS = "Show tabs";
const SEGMENT =
	"cv:grid cv:size-10 cv:flex-none cv:cursor-pointer cv:place-items-center cv:rounded-full cv:border-0 cv:bg-transparent cv:p-0 cv:text-ink cv:shadow-none cv:hover:bg-fill-hover cv:focus-visible:outline-2 cv:focus-visible:outline-offset-2 cv:focus-visible:outline-ring";

export function ColumnOpener(): ReactElement {
	const toggleColumn = useCommand(ToggleColumnCommand);
	return (
		<span className={`cv:flex cv:flex-none ${ALL_TABS_LEAVES}`}>
			<Tip label={SHOW_TABS}>
				<button
					type="button"
					aria-label={SHOW_TABS}
					aria-keyshortcuts="Meta+Backslash"
					className={SEGMENT}
					onClick={() => void toggleColumn.run()}
					data-host-all-tabs=""
				>
					<Icon name="chevron-down" size={18} />
				</button>
			</Tip>
		</span>
	);
}
