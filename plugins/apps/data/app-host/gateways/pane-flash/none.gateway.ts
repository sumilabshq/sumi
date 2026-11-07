import { PaneFlashGateway } from "./pane-flash.gateway.js";

export class NoPaneFlashGateway extends PaneFlashGateway {
	flashPane(): void {}
}
