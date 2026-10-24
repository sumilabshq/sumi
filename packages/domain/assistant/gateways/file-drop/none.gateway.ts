import { FileDropGateway } from "./file-drop.gateway.js";

export class NoFileDropGateway extends FileDropGateway {
	watch(): () => void {
		return () => undefined;
	}
}
