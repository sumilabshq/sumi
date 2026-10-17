import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon, Popover, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import type { AssistantProvider, AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";

export interface ProviderMenuProps {
	readonly setup: AssistantSetup;
	readonly onChoose: (id: string) => void;
	readonly onOpenProviders: () => void;
	readonly onClear: () => void;
	readonly onHelperAgents: (on: boolean) => void;
}

type ClosingThen = (action: () => void) => () => void;

const AGENT = "Agent";
const CONFIGURE = "Configure providers";
const CLEAR = "Clear context";
const CHAT_ONLY = "chat only";
const MENU = "Provider and context";
const HELPERS = "Use helper agents";

export function ProviderMenu(props: ProviderMenuProps): ReactElement {
	const [isOpen, setOpen] = useState(false);
	const closingThen =
		(action: () => void): (() => void) =>
		() => {
			setOpen(false);
			action();
		};
	const trigger = h("button", { type: "button", className: "wg-studio-ai-provider", "aria-label": MENU }, [
		h("span", { key: "said" }, props.setup.providerLabel),
		h(Icon, { key: "mark", name: "chevron-down", size: 12 }),
	]);
	const menu = { isOpen, onOpenChange: setOpen, placement: "below" as const, className: "wg-studio-ai-menu", trigger };
	return h(Popover, menu, menuItemsOf(props, closingThen));
}

function menuItemsOf(props: ProviderMenuProps, closingThen: ClosingThen): ReactNode[] {
	const { setup, onOpenProviders, onClear } = props;
	return [
		h("span", { key: "eyebrow", className: "wg-studio-ai-menu-eyebrow" }, AGENT),
		...setup.providers.map((provider) => providerItemOf(provider, props, closingThen)),
		h(PopoverSeparator, { key: "line" }),
		helpersItemOf(props, closingThen),
		h(PopoverItem, { key: "configure", onClick: closingThen(onOpenProviders) }, CONFIGURE),
		h(PopoverItem, { key: "clear", onClick: closingThen(onClear) }, CLEAR),
	];
}

function providerItemOf(provider: AssistantProvider, props: ProviderMenuProps, closingThen: ClosingThen): ReactElement {
	const pick = { key: provider.id, checked: provider.id === props.setup.chosen };
	return h(PopoverItem, { ...pick, onClick: closingThen(() => props.onChoose(provider.id)) }, providerSaid(provider));
}

function helpersItemOf({ setup, onHelperAgents }: ProviderMenuProps, closingThen: ClosingThen): ReactElement {
	const press = {
		key: "helpers",
		className: "is-switch",
		checked: setup.helperAgents,
		onClick: closingThen(() => onHelperAgents(!setup.helperAgents)),
	};
	return h(PopoverItem, press, [
		h("span", { key: "said", className: "wg-studio-ai-menu-said" }, HELPERS),
		h("span", { key: "switch", className: "wg-studio-ai-menu-switch", "aria-hidden": true }),
	]);
}

function providerSaid(provider: AssistantProvider): ReactNode[] {
	return [
		h("span", { key: "said", className: "wg-studio-ai-menu-said" }, provider.label),
		provider.canEdit ? null : h("span", { key: "aside", className: "wg-studio-ai-menu-aside" }, CHAT_ONLY),
	];
}
