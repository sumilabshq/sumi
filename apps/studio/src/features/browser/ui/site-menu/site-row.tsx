import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Segmented } from "@widgetarium/kit";
import type { AccessLevel } from "@widgetarium/browser";

export interface SiteRowProps {
	readonly siteKey: string;
	readonly level: AccessLevel;
	readonly said: string;
	readonly onLevel: (level: AccessLevel) => void;
}

const ROW = "cv:flex cv:items-center cv:gap-3 cv:py-1.5";
const AVATAR =
	"cv:grid cv:size-9 cv:flex-none cv:place-items-center cv:rounded-full cv:bg-brand-wash cv:text-sm cv:font-medium cv:text-brand";
const NAMES = "cv:flex cv:min-w-0 cv:flex-1 cv:flex-col";
const SITE = "cv:truncate cv:text-sm cv:font-medium cv:text-ink";
const SAID = "cv:truncate cv:text-xs cv:text-muted-foreground";

const LEVELS: readonly { readonly value: AccessLevel; readonly label: string }[] = [
	{
		value: "allowed",
		label: "Allowed",
	},
	{
		value: "ask",
		label: "Ask",
	},
	{
		value: "blocked",
		label: "Blocked",
	},
];

export function SiteRow({ siteKey, level, said, onLevel }: SiteRowProps): ReactElement {
	return (
		<div className={ROW} data-browser-site={siteKey}>
			<span className={AVATAR} aria-hidden="true">
				{siteKey.charAt(0)}
			</span>
			<span className={NAMES}>
				<span className={SITE}>{siteKey}</span>
				<span className={SAID}>{said}</span>
			</span>
			<Segmented items={LEVELS} value={level} onValueChange={onLevel} size="s" />
		</div>
	);
}
