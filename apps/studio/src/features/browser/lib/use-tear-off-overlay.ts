import { useCommand } from "@widgetarium/framework";
import { LayTearOffGhostCommand, ShowTearOffGhostCommand, WearTearOffGhostCommand } from "@widgetarium/browser";
import type { OverlayPort } from "@widgetarium/behaviors";

export function useTearOffOverlay(): OverlayPort {
	const layGhost = useCommand(LayTearOffGhostCommand);
	const wearGhost = useCommand(WearTearOffGhostCommand);
	const showGhost = useCommand(ShowTearOffGhostCommand);
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
