import { useOptionalQuery } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { pinViewsOf } from "./pin-views.js";
import type { PinView } from "./pin-views.js";
import { usePins } from "./use-pins.js";

export function usePinViews(): readonly PinView[] {
	const pinned = usePins();
	const holders = useOptionalQuery(appHost.tabs.holders, { ids: pinned.map(({ id }) => id) }).data?.holders ?? [];
	const sidebar = useOptionalQuery(appHost.tabs.tabsSidebar).data ?? undefined;
	return pinViewsOf(pinned, holders, sidebar);
}
