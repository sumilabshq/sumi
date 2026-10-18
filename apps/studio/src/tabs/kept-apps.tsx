import { createElement as h, Fragment, useState, useSyncExternalStore } from "react";
import type { ReactElement, ReactNode } from "react";
import { AppKindSchema } from "@widgetarium/app-host";
import type { AppKind } from "@widgetarium/app-host";
import type { AppHostParts } from "@widgetarium/app-host/gateways";

export interface KeptAppsProps {
	readonly shown: AppKind | null;
	readonly hostTabs: AppHostParts["hostTabs"];
	readonly drawnOf: (app: AppKind) => ReactNode;
}

export function KeptApps({ shown, hostTabs, drawnOf }: KeptAppsProps): ReactElement {
	const kept = useKeptApps(shown, hostTabs);
	return (
		<Fragment>
			{kept.map((app) => (
				<div
					key={app}
					className="wg-studio-kept"
					data-studio-kept={app === shown ? "shown" : "hidden"}
					data-studio-kept-app={app}
					inert={app !== shown}
					aria-hidden={app === shown ? undefined : true}
				>
					{drawnOf(app)}
				</div>
			))}
		</Fragment>
	);
}

function useKeptApps(shown: AppKind | null, hostTabs: AppHostParts["hostTabs"]): readonly AppKind[] {
	const { tabs } = useSyncExternalStore(hostTabs.watch, hostTabs.now);
	const [kept, setKept] = useState<ReadonlySet<AppKind>>(() => new Set());
	const open = new Set(tabs.map((tab) => tab.app));
	const next = new Set([...kept, ...(shown === null ? [] : [shown])].filter((app) => app === shown || open.has(app)));

	if (!isSameSet(next, kept)) {
		setKept(next);
	}

	// TRADE-OFF: kept per app, not per tab: canvas tabs share one canvas and the browser holds every page in one view
	return AppKindSchema.options.filter((app) => next.has(app));
}

function isSameSet(one: ReadonlySet<AppKind>, other: ReadonlySet<AppKind>): boolean {
	return one.size === other.size && [...one].every((app) => other.has(app));
}
