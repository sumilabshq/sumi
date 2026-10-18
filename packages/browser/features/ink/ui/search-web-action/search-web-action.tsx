import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { PrimaryAction } from "../../../../shared/ui/page-state/primary-action.js";
import { SearchWebCommand } from "../../contract.js";

export interface SearchWebActionProps {
	readonly text: string;
}

const SEARCH_ICON_PX = 17;
const SEARCH_FOR = "Search for {text}";

export function SearchWebAction({ text }: SearchWebActionProps): ReactElement {
	const searchWeb = useCommand(SearchWebCommand);
	return (
		<PrimaryAction
			icon="search"
			iconSize={SEARCH_ICON_PX}
			label={SEARCH_FOR.replace("{text}", text)}
			onPress={() => void searchWeb.run({ text })}
		/>
	);
}
