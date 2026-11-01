import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ZodType } from "zod";
import { ClosedOrderSchema, ClosedWithinSchema } from "@widgetarium/tasks";
import type { ClosedOrder, ClosedWithin } from "@widgetarium/tasks";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
} from "@widgetarium/kit";
import type { TasksView } from "../../lib/use-tasks-view.js";
import { CLOSED_WITHIN_WORDS } from "../../lib/task-words.js";
import { MenuButton } from "../menu-button/menu-button.js";

export interface ClosedMenuProps {
	readonly view: TasksView;
}

const CLOSED_CHOICES: readonly ClosedWithin[] = ["day", "week", "all"];
const ORDER_WORDS: Readonly<Record<ClosedOrder, string>> = {
	newest: "Newest first",
	oldest: "Oldest first",
};

export function ClosedMenu({ view }: ClosedMenuProps): ReactElement {
	const picked = view.ask.closedWithin;
	return (
		<DropdownMenu>
			<MenuButton said={CLOSED_WITHIN_WORDS[picked]} menu="Done column" />
			<DropdownMenuContent side="bottom" align="end" aria-label="Done column">
				<DropdownMenuLabel>Show finished in</DropdownMenuLabel>
				<DropdownMenuRadioGroup
					value={CLOSED_CHOICES.includes(picked) ? picked : "day"}
					onValueChange={(value) =>
						whenParsed(ClosedWithinSchema, value, (closedWithin) => view.askBoard({ closedWithin }))
					}
				>
					{CLOSED_CHOICES.map((value) => (
						<DropdownMenuRadioItem key={value} value={value}>
							{CLOSED_WITHIN_WORDS[value]}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuLabel>Sort</DropdownMenuLabel>
				<DropdownMenuRadioGroup
					value={view.ask.closedOrder}
					onValueChange={(value) =>
						whenParsed(ClosedOrderSchema, value, (closedOrder) => view.askBoard({ closedOrder }))
					}
				>
					{ClosedOrderSchema.options.map((value) => (
						<DropdownMenuRadioItem key={value} value={value}>
							{ORDER_WORDS[value]}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function whenParsed<T>(schema: ZodType<T>, value: string, act: (parsed: T) => void): void {
	const parsed = schema.safeParse(value);

	if (!parsed.success) {
		return;
	}

	act(parsed.data);
}
