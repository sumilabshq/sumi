export type {
	Action,
	CanResult,
	CollectionGateway,
	CollectionOps,
	DuplicateIdReport,
	FilterRow,
	GatewayEvent,
	GatewayRef,
	Patch,
	PropKind,
	Query,
	Row,
	RowsResult,
	SortRow,
	Unsubscribe,
	ValueOps,
} from "../../data-framework/src/gateway/contract";

export type {
	Aka,
	Color,
	CreateAction,
	Day,
	DefaultVerbs,
	GetAction,
	ListAction,
	RemoveAction,
	Text,
	UpdateAction,
} from "../../data-framework/src/gateway/needs";

export type {
	Choice,
	Control,
	CollectionGatewayOf,
	Describes,
	FieldDescription,
	HeldSpec,
	Manifest,
	ManifestCard,
	PropSeen,
	PropsSeen,
	PropSpec as ManifestProp,
	StandardVerb,
	ValueGatewayOf,
	Visibility,
	WidgetSize,
} from "../../core/src/gateway/manifest";

export type {
	DeclaredProps,
	DrawnProps,
	PropsOf,
	GivenProps,
	Implementation,
	WidgetLayout,
	MigrationStep,
	RecordRef,
	VaultRecord,
	TileProp,
	WidgetMetadata,
	WidgetProp,
} from "../../core/src/gateway/declared";
export type { ManyResult, Upsert } from "../../core/src/gateway/many";
export type { GatewayContext, Problem, ProblemIssue } from "../../core/src/gateway/problems";
export type { GatewayMetadata } from "../../core/src/gateway/implementation-metadata";
export { defineGatewayMetadata } from "../../core/src/gateway/implementation-metadata";
export {
	defineDefaultImplementation,
	RowsInMemoryGateway,
	ValueInMemoryGateway,
} from "../../core/src/gateway/defaults";
export type { RowsFields, ValueFields } from "../../core/src/gateway/defaults";
export {
	IBaseGateway,
	ICatalogue,
	ICarrier,
	IConfigureMounts,
	IContent,
	ICrudGateway,
	IFoldIntoGroup,
	IHere,
	IHost,
	IListGateway,
	IRepeat,
	INavigator,
	IPreview,
	IReader,
	RecordRefSchema,
	ISlot,
	IValueGateway,
	VaultRecordSchema,
	defineLayout,
	defineMetadata,
	defineMigrations,
	defineStates,
} from "../../core/src/gateway/declared";
// TODO: remove z re-export once no widget imports it
export { z } from "../../core/src/gateway/declared";

export type { DataState, Listed, PageState } from "../../core/src/gateway/use-data";
export type { Page, PageInput } from "../../core/src/gateway/page";
export { PageInputSchema, PageOf } from "../../core/src/gateway/page";
export type { HandlerContext, HandlerUser } from "../../data-framework/src/gateway/handler-context";
export { useData } from "../../core/src/gateway/use-data";
export {
	action,
	arrayGateway,
	canDo,
	collectionGateway,
	soloGateway,
	valueGateway,
} from "../../core/src/gateway/create";
export { fieldOf, textOf } from "../../core/src/gateway/match";
export { narrow, normalizeWhere } from "../../core/src/gateway/narrow";
export { useNarrowed } from "../../core/src/gateway/use-narrowed";
export { useValue } from "../../core/src/gateway/use-value";
export { pickedValue } from "../../core/src/gateway/picked-value";
export type { SlotComponent, SlotList } from "../../core/src/slot-components";

export type {
	ConfigureMounts,
	FoldIntoGroup,
	Here,
	HostConsole,
	InlineContent,
	MountEntry,
	MountRow,
	Navigation,
	NavigationTarget,
	PassageReader,
	PassageRecord,
	ReadAnswer,
	Release,
	Slot,
	ViewHost,
	WidgetCatalogue,
	WidgetPreview,
	Carrier,
	CarriedWidget,
	PlaceAt,
	CarryPointer,
} from "../../core/src/gateway/host";

export type { CreatedWidget, WidgetToCreate } from "../../core/src/widget-api";
export { createWidget } from "../../core/src/widget-api";
export { inject, widget } from "../../core/src/widget-builder";
export { useCommand } from "../../core/src/use-command";
export { useQuery } from "../../core/src/use-query";
export type { CommandHandleOf } from "../../core/src/use-command";
export type { QueryHandleOf } from "../../core/src/use-query";
export type {
	AskedPagedQueryHandle,
	AskedQueryHandle,
	BoundCommandHandle,
	CommandHandle,
	PagedQueryHandle,
	PageItems,
	QueryHandle,
} from "../../data-framework/src/handle-types";
export { OnRefused, toastRefusal } from "../../data-framework/src/command-refusals";
export type { CommandRefusal, RefusalHandler } from "../../data-framework/src/command-refusals";
export type {
	BuiltGivenProps,
	BuiltWidget,
	FailedViewProps,
	Inject,
	InjectProps,
	KindsNamed,
	WidgetBuilder,
} from "../../core/src/widget-builder-types";
export type { DialogProps } from "../../core/src/dialog";
export {
	ConfirmDialog,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../../core/src/dialog";
export type { ConfirmDialogProps } from "../../core/src/confirm-dialog";
export type { DialogPartProps } from "../../core/src/dialog-parts";
export type { EditableTabsProps } from "../../core/src/editable-tabs";
export { EditableTabs } from "../../core/src/editable-tabs";
export type { TabRow, TabStep, TabVerb } from "../../core/src/tab-rows";
export { applyTabStep, archivedOf, movesRows, movesSelection, tabsOf } from "../../core/src/tab-rows";
export type { MountedProps } from "../../core/src/mounted";
export { Mounted } from "../../core/src/mounted";
export type { WidgetRootProps } from "../../core/src/widget-root";
export { WidgetRoot } from "../../core/src/widget-root";
export type { CommandAnswer } from "../../data-framework/src/gateway/run-handler";
export { ICommand, IQuery } from "../../core/src/gateway/queries";
