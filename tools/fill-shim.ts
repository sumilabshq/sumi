export {
	AppearanceOverride,
	BACKGROUND,
	ROUNDED,
	useBackgroundType,
	useWidgetRounded,
	WidgetRoot,
} from "../packages/shared/core/src/widget-root.js";
export {
	Dialog,
	DialogOverlay,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
	DialogClose,
	ConfirmDialog,
} from "../packages/shared/core/src/dialog.js";
export { Mounted } from "../packages/shared/core/src/mounted.js";
export { Kit } from "../packages/shared/kit/src/index.ts";

export { createWidget } from "../packages/shared/core/src/widget-api.js";
export {
	IBaseGateway,
	ICatalogue,
	IConfigureMounts,
	IContent,
	ICrudGateway,
	IFoldIntoGroup,
	IHere,
	IHost,
	IListGateway,
	IRepeat,
	INavigator,
	IReader,
	RecordRefSchema,
	ISlot,
	IValueGateway,
	VaultRecordSchema,
	defineLayout,
	defineMetadata,
	defineMigrations,
	defineStates,
	z,
} from "../packages/shared/core/src/gateway/declared";
export { ICommand, IQuery } from "../packages/shared/core/src/gateway/queries";
export { defineGatewayMetadata } from "../packages/shared/core/src/gateway/implementation-metadata";
export {
	defineDefaultImplementation,
	RowsInMemoryGateway,
	ValueInMemoryGateway,
} from "../packages/shared/core/src/gateway/defaults";
export {
	action,
	arrayGateway,
	canDo,
	collectionGateway,
	soloGateway,
	valueGateway,
} from "../packages/shared/core/src/gateway/create";
export { fieldOf, textOf } from "../packages/shared/core/src/gateway/match";
export { useData } from "../packages/shared/core/src/gateway/use-data";
export { useValue } from "../packages/shared/core/src/gateway/use-value";
export { applyTabStep, archivedOf, movesRows, movesSelection, tabsOf } from "../packages/shared/core/src/tab-rows.js";
export { EditableTabs, toTabList } from "../packages/shared/core/src/editable-tabs.js";
export { narrow, normalizeWhere } from "../packages/shared/core/src/gateway/narrow";
export { pickedValue } from "../packages/shared/core/src/gateway/refs.js";
export { useNarrowed } from "../packages/shared/core/src/gateway/use-narrowed";
