import { createElement as h } from "react";
import type { Key, ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import type { SegmentedItem } from "@widgetarium/kit";
import { RAISED_PILL } from "../../lib/top-bar/top-bar-look.js";

export interface PillSwitchProps<V extends Key> {
	readonly items: readonly SegmentedItem<V>[];
	readonly value: V;
	readonly onValueChange: (value: V) => void;
}

// TODO: a kit Segmented pill variant, not overrides of its internals
const PILL_SWITCH = `${RAISED_PILL} cv:flex-none cv:items-center cv:gap-0.5 cv:p-1 cv:[&_[role=tab]]:h-10 cv:[&_[role=tab]]:px-3.5 cv:[&_[role=tab]]:text-sm cv:[&_[role=tab]]:font-normal cv:[&_[role=tab]]:text-ink cv:[&_[role=tab][aria-selected=true]]:font-medium cv:[&_[role=tab][aria-selected=true]]:text-primary-foreground cv:[&_.wg-kit-seg-thumb]:inset-y-1 cv:[&_.wg-kit-seg-thumb]:bg-primary cv:[&_.wg-kit-seg-thumb]:shadow-none`;

export function PillSwitch<V extends Key>({ items, value, onValueChange }: PillSwitchProps<V>): ReactElement {
	return <Segmented<V> items={items} value={value} onValueChange={onValueChange} className={PILL_SWITCH} />;
}
