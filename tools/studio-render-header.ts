type Check = (what: string, isOk: boolean, got: unknown) => void;

interface Round {
	readonly w: number;
	readonly h: number;
	readonly isCircle: boolean;
}

interface HeaderTab {
	readonly selected: string | null;
	readonly label: string | null;
	readonly text: string;
	readonly h: number;
}

export interface StudioHeader {
	readonly hostOrder: readonly string[];
	readonly appBeforeHost: boolean;
	readonly tabs: readonly HeaderTab[];
	readonly tabsPill: number;
	readonly appOrder: readonly string[];
	readonly picker: number;
	readonly picture: Round | null;
	readonly toggle: Round | null;
	readonly add: Round | null;
	readonly addDisabled: string | null;
	readonly close: Round | null;
	readonly closeLabel: string | null;
	readonly chatMenu: Round | null;
	readonly chatHead: string | null;
}

const HEADER_PX = 48;
const INNER_PX = 40;
const NESTED_PX = 36;
const HOST_ORDER = [
	"[data-host-zone] [data-host-tabs]",
	"[data-host-zone] [data-host-add]",
	"[data-host-zone] [data-host-close]",
];
const APP_ORDER = [
	"[data-app-zone] [data-canvas-sidebar-toggle]",
	"[data-app-zone] [data-canvas-page-picker]",
	"[data-app-zone] [data-canvas-zoom]",
];
const PROVIDER_SAID = /helpers (on|off)|Claude Code|chat only/;

interface HeaderLaw {
	readonly said: string;
	readonly holds: (header: StudioHeader) => boolean;
	readonly shown: (header: StudioHeader) => unknown;
}

const HEADER_LAWS: readonly HeaderLaw[] = [
	{
		said: "header: the app zone stands left of the host zone",
		holds: ({ appBeforeHost }) => appBeforeHost,
		shown: ({ appBeforeHost }) => appBeforeHost,
	},
	{
		said: "header: the host zone reads tabs, then +, then ×",
		holds: ({ hostOrder }) => isSameOrder(hostOrder, HOST_ORDER),
		shown: ({ hostOrder }) => hostOrder,
	},
	{
		said: "header: only the shown tab says its name; every tab keeps its aria label",
		holds: ({ tabs }) => tabs.length > 0 && tabs.every(isLabelledOnlyWhenShown),
		shown: ({ tabs }) => tabs,
	},
	{
		said: "header: the tabs pill is 48px, each tab in it 40px",
		holds: ({ tabsPill, tabs }) => tabsPill === HEADER_PX && tabs.every((tab) => tab.h === INNER_PX),
		shown: ({ tabsPill, tabs }) => ({ pill: tabsPill, tabs: tabs.map((tab) => tab.h) }),
	},
	{
		said: "header: the app zone holds the canvas's sidebar toggle, page picker and zoom, in that order",
		holds: ({ appOrder }) => isSameOrder(appOrder, APP_ORDER),
		shown: ({ appOrder }) => appOrder,
	},
	{
		said: "header: the page picker is a 48px pill with a 36px round picture button in it",
		holds: ({ picker, picture }) => picker === HEADER_PX && isCircleOf(picture, NESTED_PX),
		shown: ({ picker, picture }) => ({ picker, picture }),
	},
	{
		said: "header: the sidebar toggle, + and × are 48px circles",
		holds: ({ toggle, add, close }) => [toggle, add, close].every((round) => isCircleOf(round, HEADER_PX)),
		shown: ({ toggle, add, close }) => ({ toggle, add, close }),
	},
	{
		said: "header: + waits for the catalogue, × is labelled Back to view",
		holds: ({ addDisabled, closeLabel }) => addDisabled === "true" && closeLabel === "Back to view",
		shown: ({ addDisabled, closeLabel }) => ({ add: addDisabled, close: closeLabel }),
	},
	{
		said: "header: the chat's … is a 48px circle",
		holds: ({ chatMenu }) => isCircleOf(chatMenu, HEADER_PX),
		shown: ({ chatMenu }) => chatMenu,
	},
	{
		said: "header: the chat header names no provider and no helpers",
		holds: ({ chatHead }) => chatHead !== null && !PROVIDER_SAID.test(chatHead),
		shown: ({ chatHead }) => chatHead,
	},
];

export function checkStudioHeader(header: StudioHeader | undefined, check: Check): void {
	if (!header) {
		check("header: the canvas header was measured", false, header);
		return;
	}

	for (const law of HEADER_LAWS) {
		check(law.said, law.holds(header), law.shown(header));
	}
}

function isLabelledOnlyWhenShown({ selected, label, text }: HeaderTab): boolean {
	const said = selected === "true" ? label : "";
	return label !== null && text === said;
}

function isCircleOf(round: Round | null, px: number): boolean {
	return round !== null && round.w === px && round.h === px && round.isCircle;
}

function isSameOrder(seen: readonly string[], wanted: readonly string[]): boolean {
	return seen.length === wanted.length && seen.every((selector, at) => selector === wanted[at]);
}
