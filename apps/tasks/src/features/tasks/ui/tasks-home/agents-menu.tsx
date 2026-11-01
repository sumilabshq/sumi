import { createElement as h } from "react";
import type { ReactElement } from "react";
import { BoardQuery } from "@widgetarium/tasks";
import { useQuery } from "@widgetarium/core/requests";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
} from "@widgetarium/kit";
import type { TasksView } from "../../lib/use-tasks-view.js";
import { MenuButton } from "../menu-button/menu-button.js";

export interface AgentsMenuProps {
	readonly view: TasksView;
}

const ALL_AGENTS = "all";
const ALL_AGENTS_SAID = "All agents";

export function AgentsMenu({ view }: AgentsMenuProps): ReactElement {
	const { columns } = useQuery(BoardQuery, {
		...view.ask,
		owner: null,
	}).data;
	const owners = [...new Set(columns.flatMap((column) => column.cards.flatMap((card) => card.owner ?? [])))];
	const picked = view.ask.owner ?? ALL_AGENTS;
	return (
		<span className="wg-tasks-filter">
			<DropdownMenu>
				<MenuButton said={picked === ALL_AGENTS ? ALL_AGENTS_SAID : picked} menu="Agents" />
				<DropdownMenuContent side="bottom" align="end" aria-label="Agents">
					<DropdownMenuLabel>Owner chat</DropdownMenuLabel>
					<DropdownMenuRadioGroup
						value={picked}
						onValueChange={(owner) => view.askBoard({ owner: owner === ALL_AGENTS ? null : owner })}
					>
						<DropdownMenuRadioItem value={ALL_AGENTS}>{ALL_AGENTS_SAID}</DropdownMenuRadioItem>
						{owners.map((owner) => (
							<DropdownMenuRadioItem key={owner} value={owner}>
								{owner}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</span>
	);
}
