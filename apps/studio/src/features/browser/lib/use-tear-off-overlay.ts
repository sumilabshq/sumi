import { useCommand } from "@widgetarium/data-framework";
import { browser } from "@widgetarium/browser/contract";
import type { OverlayPort } from "@widgetarium/behaviors";

export function useTearOffOverlay(): OverlayPort {
	const layGhost = useCommand(browser.tabs.layTearOffGhost);
	const wearGhost = useCommand(browser.tabs.wearTearOffGhost);
	const showGhost = useCommand(browser.tabs.showTearOffGhost);
	return {
		lay: async (lay) => {
			const answer = await layGhost.run(lay);

			if (!answer.ok) {
				console.info(`[widgetarium] tear-off ghost none → none (${answer.reason})`);
			}

			return answer.ok;
		},
		wear: (worn) => void wearGhost.run(worn),
		show: (shown) => void showGhost.run({ shown }),
	};
}
