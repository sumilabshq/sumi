import type { SpecRead } from "@widgetarium/core/app-spec.js";
import type { DesignFolderRead } from "../../shared/lib/design/design-shown.js";

export abstract class DesignFolderGateway {
	abstract folder(app: string): Promise<DesignFolderRead>;
	abstract spec(app: string): Promise<SpecRead | null>;
	abstract forgetFolder(app: string): void;
	abstract designChanged(listener: (app: string) => void): () => void;
}
