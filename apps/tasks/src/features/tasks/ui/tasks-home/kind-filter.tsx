import { createElement as h } from "react";
import type { ReactElement } from "react";
import { TaskKindSchema } from "@widgetarium/tasks";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
} from "@widgetarium/kit";
import { KIND_WORDS } from "../../lib/task-words.js";
import type { TasksView } from "../../lib/use-tasks-view.js";
import { MenuButton } from "../menu-button/menu-button.js";

export interface KindFilterProps {
	readonly view: TasksView;
}

const ANY_KIND = "any";
const ANY_KIND_SAID = "Any kind";

export function KindFilter({ view }: KindFilterProps): ReactElement {
	const kind = view.ask.kind;
	return (
		<span className="wg-tasks-filter">
			<DropdownMenu>
				<MenuButton said={kind === null ? ANY_KIND_SAID : KIND_WORDS[kind]} menu="Kind" />
				<DropdownMenuContent side="bottom" align="end" aria-label="Kind">
					<DropdownMenuLabel>Kind</DropdownMenuLabel>
					<DropdownMenuRadioGroup
						value={kind ?? ANY_KIND}
						onValueChange={(picked) => view.askBoard({ kind: TaskKindSchema.safeParse(picked).data ?? null })}
					>
						<DropdownMenuRadioItem value={ANY_KIND}>{ANY_KIND_SAID}</DropdownMenuRadioItem>
						{TaskKindSchema.options.map((value) => (
							<DropdownMenuRadioItem key={value} value={value}>
								{KIND_WORDS[value]}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</span>
	);
}
