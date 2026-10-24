import { PaneFlashGateway } from "./pane-flash.gateway.js";

const FLASH: readonly Keyframe[] = [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }];
const FLASH_MS = 420;

// TRADE-OFF: a pane flashes by a direct animation, since a reveal is a moment and no state
export class DocumentPaneFlashGateway extends PaneFlashGateway {
	flashPane(paneId: string): void {
		globalThis.document?.querySelector(`[data-pane-id="${CSS.escape(paneId)}"]`)?.animate([...FLASH], FLASH_MS);
	}
}
