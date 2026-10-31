import { createElement as h } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { SIDEBAR_CARD } from "../../lib/tabs-look/tabs-look.js";

export type CardMarks = Readonly<Record<`data-${string}`, string | undefined>>;

export interface SidebarCardProps {
	readonly isOpen: boolean;
	readonly hue?: string | null;
	readonly marks?: CardMarks;
	readonly style?: CSSProperties | undefined;
	readonly label?: string | undefined;
	readonly children: ReactNode;
}

export function SidebarCard({
	isOpen,
	hue = null,
	marks = {},
	style,
	label,
	children,
}: SidebarCardProps): ReactElement {
	return (
		<div
			className={SIDEBAR_CARD}
			style={style}
			role={label === undefined ? undefined : "group"}
			aria-label={label}
			data-hue={hue ?? undefined}
			data-open={isOpen || undefined}
			{...marks}
		>
			{children}
		</div>
	);
}
