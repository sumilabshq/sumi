import { ICommand, IQuery, inject, widget } from "@widgetarium/core";
import { AgentLookSchema } from "../schemas/agent-look.schema.js";
import { PageAskSchema } from "../schemas/canvas-view.schema.js";
import { AgentLookChip } from "../ui/agent-look/agent-look-chip.js";

export const agentLookInject = inject({
	getAgentLook: IQuery.output(AgentLookSchema.nullable().default(null)),
	showPage: ICommand.input(PageAskSchema),
});

export const AgentLookWidget = widget().inject(agentLookInject).render(AgentLookChip);
