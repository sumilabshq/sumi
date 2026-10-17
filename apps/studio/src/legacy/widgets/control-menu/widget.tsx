import { createElement as h, useState } from "react";
import { z } from "zod";
import { Popover } from "@widgetarium/kit";
import { defineLayout, defineMetadata } from "@widgetarium/core/gateway/declared.js";
import { ICommand, IQuery } from "@widgetarium/core/gateway/queries.js";
import { useData } from "@widgetarium/core/gateway/use-data.js";
import { createWidget } from "@widgetarium/core/widget-api.js";
import { HelperAgentsAskedSchema, ProviderAskedSchema, AgentSetupSchema } from "../../shared/agent-setup.js";
import { NOTHING_ASKED, NothingAskedSchema, StudioAppSchema } from "../../shared/studio-app.js";
import { QuietLine } from "../quiet-line.js";
import { useRefusal } from "../use-refusal.js";
import type { Answer } from "../use-refusal.js";
import { AgentItems } from "./agent-items.js";
import { CurrentApp } from "./current-app.js";
import { MenuTrigger } from "./menu-trigger.js";

const ENTER_CANVAS = { icon: "pencil-ruler", said: "Edit in canvas" };

const LEAVE_CANVAS = { icon: "arrow-left", said: "Back to view" };

const ControlMenu = createWidget({
	inject: {
		getCurrentApp: IQuery.input(NothingAskedSchema).output(StudioAppSchema),
		editInCanvas: ICommand,
		getIsInCanvas: IQuery.output(z.boolean().default(false)),
		backToView: ICommand,
		getAgentSetup: IQuery.input(NothingAskedSchema).output(AgentSetupSchema),
		chooseProvider: ICommand.input(ProviderAskedSchema),
		setHelperAgents: ICommand.input(HelperAgentsAskedSchema),
		openProviders: ICommand,
		clearChat: ICommand,
	},
	draw: (props) => {
		const [isOpen, setOpen] = useState(false);
		const { data: current, failure: currentFailure } = useData(props.getCurrentApp, NOTHING_ASKED);
		const { data: agentSetup } = useData(props.getAgentSetup, NOTHING_ASKED);
		const { refusal, isAnsweredOk } = useRefusal();
		const closedOnOk = (answer: Promise<Answer>): void => {
			void isAnsweredOk(answer).then((isOk) => isOk && setOpen(false));
		};
		const canvasItem = props.getIsInCanvas
			? { ...LEAVE_CANVAS, run: () => closedOnOk(props.backToView()) }
			: { ...ENTER_CANVAS, run: () => closedOnOk(props.editInCanvas()) };
		const agentHandlers = {
			onChoose: (id: string) => closedOnOk(props.chooseProvider({ id })),
			onHelperAgents: (on: boolean) => closedOnOk(props.setHelperAgents({ on })),
			onOpenProviders: () => closedOnOk(props.openProviders()),
			onClear: () => closedOnOk(props.clearChat()),
		};
		return (
			<Popover
				open={isOpen}
				onOpenChange={setOpen}
				placement="below"
				trigger={<MenuTrigger app={current} isOpen={isOpen} />}
			>
				<div className="wg-studio-menu" data-name="Control menu">
					{current ? (
						<CurrentApp app={current} canvas={canvasItem} />
					) : (
						<QuietLine said={currentFailure} name="Current app failure" />
					)}
					{agentSetup && agentSetup.providers.length > 0 ? <AgentItems setup={agentSetup} {...agentHandlers} /> : null}
					<QuietLine said={refusal} name="Refusal" />
				</div>
			</Popover>
		);
	},
});

export const metadata = defineMetadata(ControlMenu, {
	title: "Control menu",
	description: "The studio's corner button: edit, set up and connect this workspace, and pick the chat's agent.",
	keywords: ["menu", "control", "settings", "studio", "corner", "workspace", "agent", "provider"],
	props: {
		getCurrentApp: { label: "This workspace", hint: "The workspace the studio shows: its mark is the button." },
		editInCanvas: { label: "Edit in canvas", hint: "Shows this app's design canvas." },
		getIsInCanvas: { label: "In the canvas", hint: "On, the menu offers to go back to the app." },
		backToView: { label: "Back to view", hint: "Leaves the canvas for the app." },
		getAgentSetup: { label: "Agent", hint: "The chat's providers, the chosen one and its helper agents." },
		chooseProvider: { label: "Choose a provider", hint: "Makes a provider the one the chat talks to." },
		setHelperAgents: { label: "Use helper agents", hint: "Switches helper agents on or off." },
		openProviders: { label: "Configure providers", hint: "Opens the providers' settings." },
		clearChat: { label: "Clear context", hint: "Clears the chat's conversation." },
	},
});

export const layout = defineLayout({ role: "control", size: { preferredWidth: 48, preferredHeight: 48 } });

export default ControlMenu;
