import { createElement as h, Fragment, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { HeldTabsQuery } from "@widgetarium/app-host";
import type { AppKind, HeldTabs } from "@widgetarium/app-host";
import { useQuery } from "@widgetarium/core/requests";

export interface KeptAppsProps {
	readonly shown: AppKind | null;
	readonly drawnOf: (app: AppKind, isShown: boolean) => ReactNode;
}

type KeptInstances = ReadonlyMap<string, AppKind>;

const HAS_EMPTY_PAGE: Readonly<Record<AppKind, boolean>> = {
	browser: true,
	canvas: false,
	terminal: false,
};

export function KeptApps({ shown, drawnOf }: KeptAppsProps): ReactElement {
	const { kept, shownKey } = useKeptInstances(shown, useQuery(HeldTabsQuery).data);
	return (
		<Fragment>
			{[...kept].map(([key, app]) => (
				<div
					key={key}
					className="wg-studio-kept"
					data-studio-kept={key === shownKey ? "shown" : "hidden"}
					data-studio-kept-app={app}
					data-studio-kept-key={key}
					inert={key !== shownKey}
					aria-hidden={key === shownKey ? undefined : true}
				>
					{drawnOf(app, key === shownKey)}
				</div>
			))}
		</Fragment>
	);
}

function useKeptInstances(
	shown: AppKind | null,
	held: HeldTabs,
): { readonly kept: KeptInstances; readonly shownKey: string | null } {
	const [kept, setKept] = useState<KeptInstances>(() => new Map());
	const shownKey = shownKeyOf(shown, held.shownTabId);
	const open = new Set(held.tabs.map((tab) => instanceKeyOf(tab.app, tab.id)));
	const shownEntry: readonly (readonly [string, AppKind])[] =
		shown === null || shownKey === null ? [] : [[shownKey, shown]];
	const next: KeptInstances = new Map([...kept, ...shownEntry].filter(([key]) => key === shownKey || open.has(key)));

	if (!isSameKept(next, kept)) {
		setKept(next);
	}

	return {
		kept: next,
		shownKey,
	};
}

function shownKeyOf(shown: AppKind | null, shownTabId: string | null): string | null {
	if (shown === null) {
		return null;
	}

	return shownTabId === null && !HAS_EMPTY_PAGE[shown] ? null : instanceKeyOf(shown, shownTabId);
}

// TRADE-OFF: the browser holds every page in one view, so it is kept once; a canvas is kept per tab
function instanceKeyOf(app: AppKind, tabId: string | null): string {
	return app === "browser" || tabId === null ? app : `${app}:${tabId}`;
}

function isSameKept(one: KeptInstances, other: KeptInstances): boolean {
	return one.size === other.size && [...one.keys()].every((key) => other.has(key));
}
