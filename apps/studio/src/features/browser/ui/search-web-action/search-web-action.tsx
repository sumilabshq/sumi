import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { SearchWebCommand } from "@widgetarium/browser";
import { useHeldTab } from "../../lib/held-tab.js";
import { PrimaryAction } from "../page-state/primary-action.js";

export interface SearchWebActionProps {
	readonly text: string;
}

const SEARCH_ICON_PX = 17;
const SEARCH_FOR = "Search for {text}";

export function SearchWebAction({ text }: SearchWebActionProps): ReactElement {
	const searchWeb = useCommand(SearchWebCommand);
	const heldTabId = useHeldTab();
	return (
		<PrimaryAction
			icon="search"
			iconSize={SEARCH_ICON_PX}
			label={SEARCH_FOR.replace("{text}", text)}
			onPress={() =>
				void searchWeb.run({
					text,
					heldTabId,
				})
			}
		/>
	);
}
