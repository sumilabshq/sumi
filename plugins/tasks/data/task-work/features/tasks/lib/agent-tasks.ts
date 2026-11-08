import type { TaskCard, TaskView } from "@widgetarium/tasks/contract";
import type { AgentCard, AgentTask } from "../../../shared/schema/agent-task.schema.js";

export function agentCardOf(card: TaskCard): AgentCard {
	return {
		id: card.id,
		title: card.title,
		kind: card.kind,
		status: card.status,
		owner: card.owner,
		note: card.note,
		blocker: card.blocker === null ? null : `${card.blocker.kind}: ${card.blocker.detail}`,
		waitsFor: card.waitsFor,
		...progressOf(card),
		nextStep: card.nextStep,
		isStale: card.isStale,
	};
}

export function agentTaskOf(view: TaskView): AgentTask {
	return {
		...agentCardOf(view.card),
		description: view.description,
		parent: view.parent,
		acceptance: view.acceptance.map(({ id, text, state, evidence }) => ({ id, text, state, evidence })),
		plan: view.plan.map(({ id, text, state, note }) => ({ id, text, state, note })),
		documents: view.documents.map(({ id, kind, title, path }) => ({ id, kind, title, path })),
		workplaces: view.workplaces.map(({ folder, branch, worktree }) => ({ folder, branch, worktree })),
		testCases: view.testPlan === null ? null : view.testPlan.cases.length,
	};
}

function progressOf({ steps, criteria }: TaskCard): Pick<AgentCard, "steps" | "criteria"> {
	return {
		steps: `${steps.done}/${steps.total}`,
		criteria: `${criteria.done}/${criteria.total}`,
	};
}
