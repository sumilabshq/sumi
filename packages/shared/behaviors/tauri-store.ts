export { HeldDoc } from "./src/tauri-store/held-doc.js";
export type { DocAt } from "./src/tauri-store/held-doc.js";
export { GLOBAL_ROOT, StoreClient, folderRootOf, workspaceRootOf } from "./src/tauri-store/store-client.js";
export type {
	DocKind,
	DocState,
	FolderRoot,
	LinesAsk,
	LinesPage,
	Replaced,
	StoreRoot,
	WorkspaceRoot,
} from "./src/tauri-store/store-client.js";
export { StoreRefusedError, callStore } from "./src/tauri-store/store-invoke.js";
export type { Invoke, StoreCommand, StoreRefusal } from "./src/tauri-store/store-invoke.js";
export { validEntriesOf, validValuesOf } from "./src/tauri-store/valid-entries.js";
