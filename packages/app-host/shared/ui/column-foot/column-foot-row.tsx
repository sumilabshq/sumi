import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface ColumnFootRowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly icon: string;
	readonly label: string;
	readonly hint: string | null;
}

const ROW =
	"cv:flex cv:h-12 cv:w-full cv:flex-none cv:cursor-pointer cv:items-center cv:justify-start cv:gap-2.5 cv:rounded-full cv:border-0 cv:bg-transparent cv:py-0 cv:ps-3.5 cv:pe-4 cv:text-start cv:font-[inherit] cv:text-sm cv:font-medium cv:text-muted-foreground cv:shadow-none cv:hover:bg-fill-hover cv:focus-visible:outline-2 cv:focus-visible:outline-ring";
const KEY_HINT =
	"cv:ms-auto cv:border-0 cv:bg-transparent cv:p-0 cv:font-mono cv:text-xs cv:font-medium cv:text-[var(--wg-studio-tabs-faint)] cv:shadow-none";

export function ColumnFootRow({ icon, label, hint, ...button }: ColumnFootRowProps): ReactElement {
	return (
		<button type="button" className={ROW} {...button}>
			<Icon name={icon} size={16} className="cv:flex-none" />
			{label}
			{hint === null ? null : (
				<kbd className={KEY_HINT} data-host-new-tab-key="">
					{hint}
				</kbd>
			)}
		</button>
	);
}
