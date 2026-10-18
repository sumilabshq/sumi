import { createElement as h } from "react";
import type { ReactElement, RefObject } from "react";
import { Icon } from "@widgetarium/kit";

export interface PickerSearchProps {
	readonly field: RefObject<HTMLInputElement | null>;
	readonly search: string;
	readonly onSearch: (search: string) => void;
}

const SEARCH_APPS = "Search apps";
const BOX =
	"cv:mb-1 cv:flex cv:h-10 cv:flex-none cv:items-center cv:gap-2.5 cv:rounded-full cv:px-3.5 cv:text-[var(--wg-studio-glass-faint,var(--muted-foreground))] cv:shadow-[inset_0_0_0_1px_var(--wg-studio-glass-edge,var(--border))] cv:has-[:focus-visible]:outline-2 cv:has-[:focus-visible]:outline-ring";
const FIELD =
	"cv:h-full cv:min-w-0 cv:flex-1 cv:rounded-none cv:border-0 cv:bg-transparent cv:p-0 cv:text-sm cv:text-ink cv:shadow-none cv:outline-none cv:placeholder:text-[var(--wg-studio-glass-faint,var(--muted-foreground))] cv:focus:shadow-none cv:[--no-tooltip:true]";

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
		</label>
	);
}
