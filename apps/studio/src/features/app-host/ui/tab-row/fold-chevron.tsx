import { createElement as h } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { CHEVRON_TURN, ROW_CHEVRON } from "../../lib/tabs-look/tabs-look.js";

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
const CHEVRON = `${ROW_CHEVRON} cv:cursor-pointer cv:rounded-none cv:border-0 cv:bg-transparent cv:p-0 cv:[font:inherit] cv:outline-none cv:hover:bg-(--sumi-active) cv:hover:duration-0 cv:focus-visible:[box-shadow:inset_0_0_0_1.5px_var(--sumi-focus-ring)]`;

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
			data-folded={fold.isFolded || undefined}
		>
			<span className={CHEVRON_TURN} data-folded={fold.isFolded || undefined}>
				<Icon name="chevron-down" size={12} />
			</span>
		</button>
	);
}
