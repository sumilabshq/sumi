import { definePack } from "@widgetarium/core/engine/packs.js";
import type { Pack } from "@widgetarium/core/engine/packs.js";
import { cataloguePack } from "@widgetarium/pack-catalogue";
import { defineCommandMetadata, defineGatewayMetadata } from "@widgetarium/core/gateway/implementation-metadata.js";
import { AppsQuery, CurrentAppQuery } from "./apps-queries.js";
import {
	BackToViewCommand,
	CreateAppCommand,
	EditInCanvasCommand,
	OpenAppCommand,
	RenameAppCommand,
} from "./studio-commands.js";
import { IsInCanvasQuery } from "./studio-state-queries.js";
import { AgentSetupQuery } from "./agent-queries.js";
import {
	ChooseProviderCommand,
	ClearChatCommand,
	OpenProvidersCommand,
	SetHelperAgentsCommand,
} from "./agent-commands.js";
import { AppFieldsSchema, NoFieldsSchema } from "./studio-fields.js";

const RESOURCE = "Apps";

export const studioPack = definePack({
	id: "@studio",
	title: "Studio",
	queries: [
		defineGatewayMetadata(AppsQuery, {
			id: "@studio/apps",
			title: "Workspaces",
			resource: RESOURCE,
			description: "Every workspace the host holds, each with its mark and how many pages it has.",
			fields: NoFieldsSchema,
		}),
		defineGatewayMetadata(CurrentAppQuery, {
			id: "@studio/current-app",
			title: "This app",
			resource: RESOURCE,
			description: "The app the studio shows, named by its id.",
			fields: AppFieldsSchema,
		}),
		defineGatewayMetadata(IsInCanvasQuery, {
			id: "@studio/is-in-canvas",
			title: "In the canvas",
			resource: RESOURCE,
			description: "Whether the studio shows the app's canvas instead of the app.",
			fields: NoFieldsSchema,
		}),
		defineGatewayMetadata(AgentSetupQuery, {
			id: "@studio/agent-setup",
			title: "Agent setup",
			resource: RESOURCE,
			description: "The providers the chat can use, the chosen one and whether helper agents are on.",
			fields: NoFieldsSchema,
		}),
	],
	commands: [
		defineCommandMetadata(OpenAppCommand, {
			id: "@studio/open-app",
			title: "Open a workspace",
			resource: RESOURCE,
			description: "Opens the workspace on its first page.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(CreateAppCommand, {
			id: "@studio/create-app",
			title: "New workspace",
			resource: RESOURCE,
			description: "Starts a new workspace and opens it.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(RenameAppCommand, {
			id: "@studio/rename-app",
			title: "Rename a workspace",
			resource: RESOURCE,
			description: "Renames the workspace and its folder; notes naming it follow.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(EditInCanvasCommand, {
			id: "@studio/edit-in-canvas",
			title: "Edit in canvas",
			resource: RESOURCE,
			description: "Shows the app's design canvas.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(BackToViewCommand, {
			id: "@studio/back-to-view",
			title: "Back to view",
			resource: RESOURCE,
			description: "Leaves the canvas for the app.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(ChooseProviderCommand, {
			id: "@studio/choose-provider",
			title: "Choose a provider",
			resource: RESOURCE,
			description: "Makes the provider the one the chat talks to.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(SetHelperAgentsCommand, {
			id: "@studio/set-helper-agents",
			title: "Use helper agents",
			resource: RESOURCE,
			description: "Switches the agent's helper agents on or off.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(OpenProvidersCommand, {
			id: "@studio/open-providers",
			title: "Configure providers",
			resource: RESOURCE,
			description: "Opens the providers' settings.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
		defineCommandMetadata(ClearChatCommand, {
			id: "@studio/clear-chat",
			title: "Clear context",
			resource: RESOURCE,
			description: "Clears the chat's conversation.",
			fields: NoFieldsSchema,
			consent: "free",
		}),
	],
});

export const STUDIO_PACKS: readonly Pack[] = [studioPack, cataloguePack];
