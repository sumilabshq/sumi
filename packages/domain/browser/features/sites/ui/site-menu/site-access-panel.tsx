import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import type { AccessLevel, AccessSource } from "../../../../shared/schema/site-access.schema.js";
import { SetSiteLevelCommand, SiteAccessQuery } from "../../contract.js";
import { SiteRow } from "./site-row.js";

const MENU_LABEL = "Site access";
const PANEL = "cv:flex cv:w-[min(26rem,90vw)] cv:flex-col cv:gap-1 cv:p-3";
const HEADING = "cv:m-0 cv:px-1 cv:pb-1 cv:text-base cv:font-medium cv:text-ink";
const EMPTY = "cv:m-0 cv:px-1 cv:py-2 cv:text-sm cv:text-muted-foreground";
const FOOTNOTE = "cv:m-0 cv:px-1 cv:pt-2 cv:text-xs cv:text-muted-foreground";
const NOTHING_SET = "Open a page to set what Ink may read on it.";
const READ_ONLY = "Ink only ever reads: a screenshot and page content. It never clicks or types.";

const SAID_BY_SOURCE: Readonly<Record<AccessSource, string>> = {
	default: "Default",
	person: "Set by you",
	ask: "Allowed when Ink asked",
	list: "On the sensitive sites list",
};

export function SiteAccessPanel(): ReactElement {
	const { shown, rows } = useQuery(SiteAccessQuery).data;
	const setSiteLevel = useCommand(SetSiteLevelCommand);
	const others = rows.filter((row) => row.siteKey !== shown?.siteKey);
	const levelOf = (siteKey: string) => (level: AccessLevel) => void setSiteLevel.run({ siteKey, level });
	return (
		<div className={PANEL} data-browser-site-access="">
			<h3 className={HEADING}>{MENU_LABEL}</h3>
			{shown === null && others.length === 0 ? <p className={EMPTY}>{NOTHING_SET}</p> : null}
			{shown === null || shown.siteKey === "" ? null : (
				<SiteRow
					siteKey={shown.siteKey}
					level={shown.level}
					said={SAID_BY_SOURCE[shown.source]}
					onLevel={levelOf(shown.siteKey)}
				/>
			)}
			{others.map((row) => (
				<SiteRow
					key={row.siteKey}
					siteKey={row.siteKey}
					level={row.level}
					said={SAID_BY_SOURCE[row.source]}
					onLevel={levelOf(row.siteKey)}
				/>
			))}
			<p className={FOOTNOTE}>{READ_ONLY}</p>
		</div>
	);
}
