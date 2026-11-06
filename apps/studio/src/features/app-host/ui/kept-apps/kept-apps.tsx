import { createElement as h, Fragment, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { HeldTabsQuery } from "@widgetarium/app-host";
import type { AppKind, HeldTabs } from "@widgetarium/app-host";
import { useQuery } from "@widgetarium/data-framework";

export interface KeptInstance {
	readonly app: AppKind;
	readonly tabId: string | null;
}

export interface KeptAppsProps {
	readonly shown: AppKind | null;
	readonly drawnOf: (instance: KeptInstance, isShown: boolean) => ReactNode;
}

type KeptInstances = ReadonlyMap<string, KeptInstance>;

const APPS_WITH_EMPTY_PAGE: ReadonlySet<AppKind> = new Set(["browser"]);

export function KeptApps({ shown, drawnOf }: KeptAppsProps): ReactElement {
	const { kept, shownKey } = useKeptInstances(shown, useQuery(HeldTabsQuery).data);
	return (
		<Fragment>
			{[...kept].map(([key, instance]) => (
				<div
					key={key}
					className="wg-studio-kept"
					data-studio-kept={key === shownKey ? "shown" : "hidden"}
					data-studio-kept-app={instance.app}
					data-studio-kept-key={key}
					inert={key !== shownKey}
					aria-hidden={key === shownKey ? undefined : true}
				>
					{drawnOf(instance, key === shownKey)}
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
	const shownEntry: readonly (readonly [string, KeptInstance])[] =
		shown === null || shownKey === null
			? []
			: [
					[
						shownKey,
						{
							app: shown,
							tabId: held.shownTabId,
						},
					],
				];
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

	return shownTabId === null && !APPS_WITH_EMPTY_PAGE.has(shown) ? null : instanceKeyOf(shown, shownTabId);
}

// TRADE-OFF: the browser holds every page in one view, so it is kept once; a canvas is kept per tab
function instanceKeyOf(app: AppKind, tabId: string | null): string {
	return app === "browser" || tabId === null ? app : `${app}:${tabId}`;
}

function isSameKept(one: KeptInstances, other: KeptInstances): boolean {
	return one.size === other.size && [...one.keys()].every((key) => other.has(key));
}
