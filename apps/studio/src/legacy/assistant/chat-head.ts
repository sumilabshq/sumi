import { Fragment, createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { AssistantPort, AssistantSetup } from "@widgetarium/core/engine/assistant-port.js";
import { Mascot } from "@widgetarium/mascot";
import { CHAT_MASCOT_PX } from "./chat-lead.js";
import { ProviderMenu } from "./provider-menu.js";
import type { ProviderMenuProps } from "./provider-menu.js";
import type { Report } from "./failure-line.js";

export interface ChatHeadProps {
	readonly port: AssistantPort;
	readonly setup: AssistantSetup;
	readonly report: Report;
	readonly lead?: ReactNode;
	readonly title?: string | undefined;
}

const TITLE = "Widgetarium AI";
const WHO = "{provider} · helpers {state}";
const HELPERS_ON = "on";
const HELPERS_OFF = "off";
const NOT_CHOSEN = "the provider {id} could not be chosen";
const HELPERS_NOT_SWITCHED = "helper agents could not be switched";
const NOT_CLEARED = "the conversation could not be cleared";

export function ChatHead({ port, setup, report, lead, title }: ChatHeadProps): ReactElement {
	return h("header", { className: "wg-studio-ai-head" }, [
		h(Mascot, { key: "mascot", size: CHAT_MASCOT_PX }),
		h("span", { className: "wg-studio-ai-named", key: "named" }, [
			h("span", { className: "wg-studio-ai-title", key: "title" }, title ?? TITLE),
			h("span", { className: "wg-studio-ai-who", key: "who" }, whoSaid(setup)),
		]),
		h(ProviderMenu, { key: "menu", setup, ...menuAsksOf(port, report) }),
		lead ? h(Fragment, { key: "lead" }, lead) : null,
	]);
}

function whoSaid({ providerLabel, helperAgents }: AssistantSetup): string {
	return WHO.replace("{provider}", providerLabel).replace("{state}", helperAgents ? HELPERS_ON : HELPERS_OFF);
}

function menuAsksOf(port: AssistantPort, report: Report): Omit<ProviderMenuProps, "setup"> {
	return {
		onChoose: (id: string) => void report(port.chooseProvider(id), NOT_CHOSEN.replace("{id}", id)),
		onOpenProviders: () => port.openProviders(),
		onHelperAgents: (on: boolean) => void report(port.setHelperAgents(on), HELPERS_NOT_SWITCHED),
		onClear: () => void report(port.clear(), NOT_CLEARED),
	};
}
