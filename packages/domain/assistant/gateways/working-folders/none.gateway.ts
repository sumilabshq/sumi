import { WorkingFoldersGateway } from "./working-folders.gateway.js";

export const WORKING_FOLDER_NOT_HERE = "A working folder cannot be chosen on this host";

export class NoWorkingFoldersGateway extends WorkingFoldersGateway {
	workspaceFolder(): null {
		return null;
	}

	saveWorkspaceFolder(): void {
		throw new Error(WORKING_FOLDER_NOT_HERE);
	}

	chosenFolder(): Promise<never> {
		return Promise.reject(new Error(WORKING_FOLDER_NOT_HERE));
	}

	attachedPickedFolder(): Promise<never> {
		return Promise.reject(new Error(WORKING_FOLDER_NOT_HERE));
	}
}
