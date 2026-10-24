import { createElement as h } from "react";
import type { Key, ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import type { SegmentedItem } from "@widgetarium/kit";
import { GHOST_HEIGHT, RAISED_PILL } from "../../lib/top-bar-look.js";
import { useTopBarLook } from "../../lib/top-bar-look-context.js";

export interface PillSwitchProps<V extends Key> {
	readonly items: readonly SegmentedItem<V>[];
	readonly value: V;
	readonly onValueChange: (value: V) => void;
}

// TODO: a kit Segmented pill variant, not overrides of its internals
const PILL_SWITCH = `${RAISED_PILL} cv:flex-none cv:items-center cv:gap-0.5 cv:p-1 cv:[&_[role=tab]]:h-10 cv:[&_[role=tab]]:px-3.5 cv:[&_[role=tab]]:text-sm cv:[&_[role=tab]]:font-normal cv:[&_[role=tab]]:text-ink cv:[&_[role=tab][aria-selected=true]]:font-medium cv:[&_[role=tab][aria-selected=true]]:text-primary-foreground cv:[&_.wg-kit-seg-thumb]:inset-y-1 cv:[&_.wg-kit-seg-thumb]:bg-primary cv:[&_.wg-kit-seg-thumb]:shadow-none`;

const GHOST_SWITCH = `${GHOST_HEIGHT} cv:flex-none cv:items-center cv:gap-0.5 cv:rounded-[var(--sumi-r-md)] cv:bg-[var(--sumi-hover)] cv:p-0.5 cv:[&_[role=tab]]:h-full cv:[&_[role=tab]]:px-[var(--sumi-sp-3)] cv:[&_[role=tab]]:text-[length:var(--sumi-fs-13)] cv:[&_[role=tab]]:font-normal cv:[&_[role=tab]]:text-[var(--sumi-text-2)] cv:[&_[role=tab][aria-selected=true]]:text-[var(--sumi-text)] cv:[&_.wg-kit-seg-thumb]:inset-y-0.5 cv:[&_.wg-kit-seg-thumb]:rounded-[var(--sumi-r-sm)] cv:[&_.wg-kit-seg-thumb]:bg-[var(--sumi-plate)] cv:[&_.wg-kit-seg-thumb]:shadow-none`;

export function PillSwitch<V extends Key>({ items, value, onValueChange }: PillSwitchProps<V>): ReactElement {
	const look = useTopBarLook();
	return (
		<Segmented<V>
			items={items}
			value={value}
			onValueChange={onValueChange}
			className={look === "ghost" ? GHOST_SWITCH : PILL_SWITCH}
		/>
	);
}
