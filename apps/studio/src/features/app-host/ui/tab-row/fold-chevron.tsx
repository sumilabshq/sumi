import { createElement as h } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface RowFold {
	readonly isFolded: boolean;
	readonly onToggle: () => void;
}

export interface FoldChevronProps {
	readonly title: string;
	readonly fold: RowFold;
}

const FOLD_LABEL = "Fold {title}";
const UNFOLD_LABEL = "Unfold {title}";
const CHEVRON =
	"cv:flex cv:size-5 cv:flex-none cv:cursor-pointer cv:items-center cv:justify-center cv:rounded-[6px] cv:border-0 cv:bg-transparent cv:p-0 cv:[font:inherit] cv:text-(--sumi-text-2) cv:outline-none cv:transition-[background-color] cv:duration-(--sumi-dur-hover) cv:ease-(--sumi-ease) cv:hover:bg-(--sumi-active) cv:hover:duration-0 cv:focus-visible:[box-shadow:inset_0_0_0_1.5px_var(--sumi-focus-ring)]";
const TURN =
	"cv:flex cv:transition-transform cv:duration-(--sumi-dur-base) cv:ease-(--sumi-ease-out) cv:motion-reduce:transition-none cv:data-[folded]:-rotate-90";

export function FoldChevron({ title, fold }: FoldChevronProps): ReactElement {
	const label = (fold.isFolded ? UNFOLD_LABEL : FOLD_LABEL).replace("{title}", title);
	return (
		<button
			type="button"
			className={CHEVRON}
			aria-label={label}
			aria-expanded={!fold.isFolded}
			onPointerDown={(event) => event.stopPropagation()}
			onClick={(event: MouseEvent) => {
				event.stopPropagation();
				fold.onToggle();
			}}
			data-tabs-fold=""
		>
			<span className={TURN} data-folded={fold.isFolded || undefined}>
				<Icon name="chevron-down" size={12} />
			</span>
		</button>
	);
}
