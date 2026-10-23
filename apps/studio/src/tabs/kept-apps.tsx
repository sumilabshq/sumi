import { createElement as h, Fragment, useState, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode } from "react";
import type { AppKind } from "@widgetarium/app-host";
import type { AppHostParts } from "@widgetarium/app-host/gateways";

export interface KeptAppsProps {
	readonly shown: AppKind | null;
	readonly hostTabs: AppHostParts["hostTabs"];
	readonly drawnOf: (app: AppKind, isShown: boolean) => ReactNode;
}

type KeptInstances = ReadonlyMap<string, AppKind>;

export function KeptApps({ shown, hostTabs, drawnOf }: KeptAppsProps): ReactElement {
	const { kept, shownKey } = useKeptInstances(shown, hostTabs);
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
	hostTabs: AppHostParts["hostTabs"],
): { readonly kept: KeptInstances; readonly shownKey: string | null } {
	const { tabs } = useSyncExternalStore(hostTabs.watch, hostTabs.now);
	const [kept, setKept] = useState<KeptInstances>(() => new Map());
	const shownKey = shown === null ? null : instanceKeyOf(shown, hostTabs.shownIdFor(shown));
	const open = new Set(tabs.map((tab) => instanceKeyOf(tab.app, tab.id)));
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

// TRADE-OFF: the browser holds every page in one view, so it is kept once; a canvas is kept per tab
function instanceKeyOf(app: AppKind, tabId: string | null): string {
	return app === "browser" || tabId === null ? app : `${app}:${tabId}`;
}

function isSameKept(one: KeptInstances, other: KeptInstances): boolean {
	return one.size === other.size && [...one.keys()].every((key) => other.has(key));
}
