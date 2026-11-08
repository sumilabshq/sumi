import { useEffect, useMemo } from "react";
import { appHost } from "@widgetarium/app-host";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";
import { places } from "@widgetarium/places";

const NOT_OPENED = "[widgetarium] the link {href} asked from tab {from} was not opened: {reason}";

export function useOpensAskedLinks(): void {
	const held = useOptionalQuery(appHost.tabs.heldTabs).data;
	const tabIds = useMemo(() => held?.tabs.map(({ id }) => id) ?? [], [held]);
	const asked = useOptionalQuery(places.tabFacts.askedLinks, { tabIds }).data;
	const { run: take } = useCommand(places.tabFacts.takeAskedLink);
	const { run: openLink } = useCommand(appHost.links.openLink);

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
