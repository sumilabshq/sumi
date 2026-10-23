import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Icon,
	IconButton,
} from "@widgetarium/kit";
import { FoldTabListCommand } from "../../../features/column/contract.js";
import { CreateGroupCommand } from "../../../features/groups/contract.js";
import { BOARD_ITEM, SECTION_MENU } from "../../lib/menu-look/menu-look.js";
import { ICON_BUTTON } from "../../lib/tabs-look/tabs-look.js";

export interface SectionHeadProps {
	readonly title: string;
	readonly isOpen: boolean;
	readonly count: number;
	readonly onGroupMade: (groupId: string) => void;
}

const TABS_IN = "Tabs in";
const FOLD = "Fold tabs";
const UNFOLD = "Unfold tabs";
const VIEW_OPTIONS = "View options";
const NEW_GROUP = "New group";
const HEAD =
	"cv:group/section cv:mt-2.5 cv:[[data-tabs-essentials]:empty~*_&]:mt-[calc((var(--sumi-header-h)-32px)/2-1px)] cv:flex cv:h-8 cv:w-full cv:flex-none cv:items-center cv:gap-1.5 cv:rounded-[10px] cv:ps-2 cv:pe-1 cv:text-[12px] cv:text-(--sumi-text-2) cv:select-none cv:[transition:padding_var(--sumi-dur-base)_var(--sumi-ease-out),background-color_var(--sumi-dur-hover)_var(--sumi-ease)] cv:hover:bg-(--sumi-hover) cv:hover:ps-[10px] cv:hover:[transition:padding_var(--sumi-dur-base)_var(--sumi-ease-out),background-color_0ms] cv:data-[shut]:ps-[10px] cv:has-[[data-state=open]]:bg-(--sumi-hover) cv:has-[[data-state=open]]:ps-[10px]";
const FOLD_BUTTON =
	"cv:-me-1.5 cv:inline-flex cv:h-[18px] cv:w-0 cv:flex-none cv:cursor-pointer cv:items-center cv:justify-center cv:overflow-hidden cv:border-0 cv:p-0 cv:[&>svg]:text-(--sumi-text-3) cv:opacity-0 cv:outline-none cv:[transition:width_var(--sumi-dur-base)_var(--sumi-ease-out),margin_var(--sumi-dur-base)_var(--sumi-ease-out),opacity_var(--sumi-dur-fast)_var(--sumi-ease),transform_var(--wg-press)_var(--wg-ease)] cv:group-hover/section:me-0 cv:group-hover/section:w-3 cv:group-hover/section:opacity-100 cv:group-data-[shut]/section:me-0 cv:group-data-[shut]/section:w-3 cv:group-data-[shut]/section:opacity-100 cv:group-has-[[data-state=open]]/section:me-0 cv:group-has-[[data-state=open]]/section:w-3 cv:group-has-[[data-state=open]]/section:opacity-100 cv:focus-visible:me-0 cv:focus-visible:w-3 cv:focus-visible:opacity-100 cv:[&>svg]:-translate-x-1 cv:[&>svg]:transition-transform cv:[&>svg]:duration-(--sumi-dur-fast) cv:group-hover/section:[&>svg]:translate-x-0 cv:group-data-[shut]/section:[&>svg]:translate-x-0";
const TITLE =
	"cv:min-w-0 cv:overflow-hidden cv:text-ellipsis cv:whitespace-nowrap cv:font-semibold cv:text-(--sumi-text)";
const COUNT = "cv:text-(--sumi-text-3)";
const ACTIONS =
	"cv:ms-auto cv:flex cv:flex-none cv:translate-x-1 cv:gap-0.5 cv:opacity-0 cv:transition-[opacity,translate] cv:duration-(--sumi-dur-fast) cv:ease-(--sumi-ease) cv:group-hover/section:translate-x-0 cv:group-hover/section:opacity-100 cv:group-has-[[data-state=open]]/section:translate-x-0 cv:group-has-[[data-state=open]]/section:opacity-100 cv:focus-within:translate-x-0 cv:focus-within:opacity-100";

export function SectionHead({ title, isOpen, count, onGroupMade }: SectionHeadProps): ReactElement {
	const foldTabList = useCommand(FoldTabListCommand);
	const newGroup = useCommand(CreateGroupCommand);
	const makeGroup = async (): Promise<void> => {
		const made = await newGroup.run({ withTabId: null });

		if (made.ok) {
			onGroupMade(made.output.id);
		}
	};
	return (
		<div className={HEAD} data-shut={isOpen ? undefined : ""} data-tabs-section="">
			<IconButton
				variant="ghost"
				aria-expanded={isOpen}
				label={isOpen ? FOLD : UNFOLD}
				className={FOLD_BUTTON}
				onClick={() => void foldTabList.run()}
				data-tabs-fold=""
			>
				<Icon name={isOpen ? "chevron-down" : "chevron-right"} size={12} />
			</IconButton>
			<span>{TABS_IN}</span>
			<b className={TITLE} data-tabs-chat-title="">
				{title}
			</b>
			{isOpen ? null : <span className={COUNT}>{count}</span>}
			<span className={ACTIONS}>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<IconButton variant="ghost" label={VIEW_OPTIONS} className={ICON_BUTTON} data-tabs-view-options="">
							<Icon name="sliders-vertical" size={13} />
						</IconButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className={SECTION_MENU}
						side="bottom"
						align="end"
						sideOffset={4}
						aria-label={VIEW_OPTIONS}
					>
						<DropdownMenuItem className={BOARD_ITEM} onSelect={() => void makeGroup()} data-tabs-new-group="">
							<Icon name="plus" size={15} />
							{NEW_GROUP}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</span>
		</div>
	);
}
