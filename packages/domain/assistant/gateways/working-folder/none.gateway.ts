import { WorkingFolderGateway } from "./working-folder.gateway.js";

export const WORKING_FOLDER_NOT_HERE = "A working folder cannot be chosen on this host";

export class NoWorkingFolderGateway extends WorkingFolderGateway {
	folders(): Promise<null> {
		return Promise.resolve(null);
	}

	watch(): () => void {
		return () => undefined;
	}

	choose(): Promise<void> {
		return Promise.reject(new Error(WORKING_FOLDER_NOT_HERE));
	}

	pickAnother(): Promise<void> {
		return Promise.reject(new Error(WORKING_FOLDER_NOT_HERE));
	}
}
