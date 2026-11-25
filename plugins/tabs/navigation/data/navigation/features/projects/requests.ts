import { PerCall, Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { callKeyOf, newProjectIdOf } from "../../shared/lib/flows/flow-ids.js";
import { flowsMove } from "../../shared/lib/flows/flow-moves.js";
import { answered } from "../../shared/lib/settling/settling.js";
import {
	CreateProjectAskSchema,
	MoveFlowToProjectAskSchema,
	MoveFolderToProjectAskSchema,
	ProjectAskSchema,
	ProjectMadeSchema,
	RenameAskSchema,
	ReorderProjectsAskSchema,
	SetProjectBaseFolderAskSchema,
} from "../../shared/schema/flow-asks.schema.js";
import {
	createProjectPlan,
	moveFlowToProjectPlan,
	moveFolderToProjectPlan,
	removeProjectPlan,
	renameProjectPlan,
	reorderProjectsPlan,
	setProjectBaseFolderPlan,
	toggleProjectPlan,
} from "./lib/project-plans.js";

export const create = command()
	.public()
	.input(CreateProjectAskSchema)
	.output(ProjectMadeSchema)
	.idempotencyKey(PerCall)
	.handle(async (ask, { tabs, idempotencyKey }) => {
		const made = answered(
			await tabs.movePlaces(flowsMove(createProjectPlan(ask, newProjectIdOf(callKeyOf(idempotencyKey))))),
		);
		return { projectId: made.projectId };
	});

export const rename = command()
	.public()
	.input(RenameAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(renameProjectPlan(ask))));
	});

export const toggle = command()
	.public()
	.input(ProjectAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(toggleProjectPlan(ask))));
	});

export const setBaseFolder = command()
	.public()
	.input(SetProjectBaseFolderAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(setProjectBaseFolderPlan(ask))));
	});

export const remove = command()
	.public()
	.input(ProjectAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(removeProjectPlan(ask))));
	});

export const reorder = command()
	.public()
	.input(ReorderProjectsAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(reorderProjectsPlan(ask))));
	});

export const moveFlow = command()
	.public()
	.input(MoveFlowToProjectAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(moveFlowToProjectPlan(ask))));
	});

export const moveFolder = command()
	.public()
	.input(MoveFolderToProjectAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tabs }) => {
		answered(await tabs.movePlaces(flowsMove(moveFolderToProjectPlan(ask))));
	});
