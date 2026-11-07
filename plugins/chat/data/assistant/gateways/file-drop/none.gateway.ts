import { FileDropGateway } from "./file-drop.gateway.js";

export class NoFileDropGateway extends FileDropGateway {
	fileDragged(): () => void {
		return () => undefined;
	}
}
