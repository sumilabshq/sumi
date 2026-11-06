import { useEffect, useMemo } from "react";
import { HeldTabsQuery, OpenLinkCommand } from "@widgetarium/app-host";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { AskedLinksQuery, TakeAskedLinkCommand } from "@widgetarium/places";

const NOT_OPENED = "[widgetarium] the link {href} asked from tab {from} was not opened: {reason}";

export function useOpensAskedLinks(): void {
	const held = useOptionalQuery(HeldTabsQuery).data;
	const tabIds = useMemo(() => held?.tabs.map(({ id }) => id) ?? [], [held]);
	const asked = useOptionalQuery(AskedLinksQuery, { tabIds }).data;
	const { run: take } = useCommand(TakeAskedLinkCommand);
	const { run: openLink } = useCommand(OpenLinkCommand);

	useEffect(() => {
		for (const { id } of asked?.links ?? []) {
			void take({ id }).then(async (taken) => {
				if (!taken.ok) {
					return;
				}

				const { href, from, inNewTab } = taken.output;
				const opened = await openLink({ href, opensNew: inNewTab });

				if (!opened.ok) {
					console.error(NOT_OPENED.replace("{href}", href).replace("{from}", from).replace("{reason}", opened.reason));
				}
			});
		}
	}, [asked, take, openLink]);
}
