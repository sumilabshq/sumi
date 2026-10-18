import { createElement as h } from "react";
import type { ReactElement, RefObject } from "react";
import { Icon } from "@widgetarium/kit";

export interface PickerSearchProps {
	readonly field: RefObject<HTMLInputElement | null>;
	readonly search: string;
	readonly onSearch: (search: string) => void;
}

const SEARCH_APPS = "Search apps";
const SHORTCUT = "⌘ K";
const BOX =
	"cv:flex cv:h-12 cv:flex-none cv:items-center cv:gap-2.5 cv:rounded-full cv:bg-fill cv:ps-[18px] cv:pe-1.5 cv:text-muted-foreground/65 cv:has-[:focus-visible]:outline-2 cv:has-[:focus-visible]:outline-ring";
const FIELD =
	"cv:h-full cv:min-w-0 cv:flex-1 cv:rounded-none cv:border-0 cv:bg-transparent cv:p-0 cv:text-[14px] cv:text-ink cv:shadow-none cv:outline-none cv:placeholder:text-muted-foreground/65 cv:focus:shadow-none cv:[--no-tooltip:true]";
const KEY =
	"cv:inline-flex cv:h-9 cv:flex-none cv:items-center cv:rounded-full cv:bg-raise cv:px-3 cv:font-mono cv:text-xs cv:font-medium cv:text-muted-foreground";

export function PickerSearch({ field, search, onSearch }: PickerSearchProps): ReactElement {
	return (
		<label className={BOX} data-host-picker-search="">
			<Icon name="search" size={16} className="cv:flex-none" />
			<input
				ref={field}
				type="text"
				className={FIELD}
				placeholder={SEARCH_APPS}
				aria-label={SEARCH_APPS}
				value={search}
				onChange={(event) => onSearch(event.currentTarget.value)}
				data-host-picker-field=""
			/>
			<span aria-hidden="true" className={KEY}>
				{SHORTCUT}
			</span>
		</label>
	);
}
