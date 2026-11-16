import { useCommand } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import type { AppTabState } from "@widgetarium/app-host/contract";
import { pins } from "@sumi/pins/contract";
import type { Pin } from "./pin-views.js";

export interface PinActs {
	readonly open: (pin: Pin) => void;
	readonly close: (pin: Pin) => void;
	readonly pin: (tab: AppTabState) => void;
	readonly unpin: (id: string) => void;
}

export function usePinActs(): PinActs {
	const openOnce = useCommand(appHost.tabActions.openOnce);
	const closeTabs = useCommand(appHost.tabActions.closeTabs);
	const pin = useCommand(pins.pins.pin);
	const unpin = useCommand(pins.pins.unpin);
	return {
		open: ({ id, app, address }) => void openOnce.run({ id, app, address }),
		close: ({ id }) => void closeTabs.run({ ids: [id] }),
		pin: (tab) =>
			void pin.run({
				id: tab.id,
				app: tab.app,
				address: tab.address ?? "",
				title: tab.title,
				icon: tab.icon,
				favicon: tab.favicon,
			}),
		unpin: (id) => void unpin.run({ id }),
	};
}
