import { PerCall, Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { callKeyOf, newFolderIdOf } from "../../shared/lib/flows/flow-ids.js";
import { flowsMove } from "../../shared/lib/flows/flow-moves.js";
import { answered } from "../../shared/lib/settling/settling.js";
import {
	CreateFolderAskSchema,
	FolderAskSchema,
	FolderMadeSchema,
	RenameAskSchema,
	SetBaseDirAskSchema,
	SetIconAskSchema,
} from "../../shared/schema/flow-asks.schema.js";
import {
	createFolderPlan,
	removeFolderPlan,
	renameFolderPlan,
	setBaseDirPlan,
	setFolderIconPlan,
	toggleFolderPlan,
} from "./lib/folder-plans.js";

export const create = command()
	.public()
	.input(CreateFolderAskSchema)
	.output(FolderMadeSchema)
	.idempotencyKey(PerCall)
	.handle(async (ask, { tabs, idempotencyKey }) => {
		const made = answered(
			await tabs.movePlaces(flowsMove(createFolderPlan(ask, newFolderIdOf(callKeyOf(idempotencyKey))))),
		);
		return { folderId: made.folderId };
	});

export const rename = command()
	.public()
	.input(RenameAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(renameFolderPlan(ask))));
	});

export const setIcon = command()
	.public()
	.input(SetIconAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(setFolderIconPlan(ask))));
	});

export const setBaseDir = command()
	.public()
	.input(SetBaseDirAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(setBaseDirPlan(ask))));
	});

export const toggle = command()
	.public()
	.input(FolderAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(toggleFolderPlan(ask))));
	});

export const remove = command()
	.public()
	.input(FolderAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(removeFolderPlan(ask))));
	});
