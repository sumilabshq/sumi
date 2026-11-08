import { z } from "zod";
import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { appHost } from "@widgetarium/app-host/contract";
import { commandMenuChanged } from "../../gateways/command-menu/command-menu.events.js";
import {
	DoorSchema,
	KeptMenuSchema,
	MenuDoorsSchema,
	OpenMenuSchema,
} from "../../shared/schema/command-menu.schema.js";
import { doorKeysOf, refuseDoor } from "./lib/doors.js";
import { heldTabOfPage } from "../../shared/lib/held-tab.js";
import { filledWithShown } from "./lib/shown-text.js";

export const isOpen = query()
	.public()
	.output(KeptMenuSchema)
	.settlesNow()
	.handle((_input, { commandMenu }) => commandMenu.menu());

export const doors = query()
	.public()
	.output(MenuDoorsSchema)
	.settlesNow()
	.handle((_input, { menuFills }) => ({
		doors: menuFills.doors().map((door) => ({
			...door,
			keys: doorKeysOf(door.letter),
		})),
	}));

export const toggle = command()
	.public()
	.input(OpenMenuSchema)
	.idempotencyKey(PerCall)
	.handle(
		async (
			{ door, text, shownName, newTabList, pageId },
			{ commandMenu: commandMenuGateway, menuFills, send, invalidate },
		) => {
			const refusal = refuseDoor(door, menuFills.doors());

			if (refusal !== null) {
				return refuse(refusal);
			}

			invalidate(isOpen);
			const was = commandMenuGateway.menu();
			const filled =
				text === null
					? filledWithShown((await send(appHost.tabs.appTabs)).tabs, shownName, await heldTabOfPage(pageId, send))
					: { door, text };

			if (
				was.isOpen &&
				(was.door === door || was.door === filled.door) &&
				was.newTabList === newTabList &&
				was.pageId === pageId
			) {
				const shut = `command menu open at ${was.door} → shut (the same opener again)`;
				commandMenuGateway.saveMenu(
					{
						...was,
						isOpen: false,
					},
					shut,
				);
				console.info(`[widgetarium] ${shut}`);
				return;
			}

			const reason = `command menu ${was.isOpen ? `open at ${was.door}` : "shut"} → open at ${filled.door} with "${filled.text}" over ${pageId ?? "the shown tab"}, new tabs into ${newTabList ?? "the shown tab's list"}`;
			commandMenuGateway.saveMenu(
				{
					isOpen: true,
					door: filled.door,
					text: filled.text,
					opening: was.opening + 1,
					newTabList,
					pageId,
				},
				reason,
			);
			console.info(`[widgetarium] ${reason}`);
		},
	);

export const changeDoor = command()
	.public()
	.input(z.object({ door: DoorSchema }))
	.idempotencyKey(Repeatable)
	.handle(({ door }, { commandMenu: commandMenuGateway, menuFills, invalidate }) => {
		const refusal = refuseDoor(door, menuFills.doors());

		if (refusal !== null) {
			return refuse(refusal);
		}

		invalidate(isOpen);
		const was = commandMenuGateway.menu();

		if (!was.isOpen || was.door === door) {
			console.info(`[widgetarium] command menu door skipped: ${was.isOpen ? `already ${door}` : "shut"}`);
			return;
		}

		const reason = `command menu door ${was.door} → ${door}`;
		commandMenuGateway.saveMenu(
			{
				...was,
				door,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const close = command()
	.public()
	.idempotencyKey(Repeatable)
	.handle((_input, { commandMenu: commandMenuGateway, invalidate }) => {
		invalidate(isOpen);
		const was = commandMenuGateway.menu();

		if (!was.isOpen) {
			console.info("[widgetarium] command menu close skipped: already shut");
			return;
		}

		const reason = `command menu open at ${was.door} → shut`;
		commandMenuGateway.saveMenu(
			{
				...was,
				isOpen: false,
			},
			reason,
		);
		console.info(`[widgetarium] ${reason}`);
	});

export const menuOnMenuChanged = subscriber(commandMenuChanged).handle((_input, { invalidate }) => {
	invalidate(isOpen);
});
