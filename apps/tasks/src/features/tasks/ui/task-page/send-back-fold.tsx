import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { Collapsible, CollapsibleContent } from "@widgetarium/kit";
import { SendBackForm } from "./send-back-form.js";

export interface SendBackFoldProps {
	readonly card: TaskCard;
	readonly isOpen: boolean;
	readonly close: () => void;
}

export function SendBackFold({ card, isOpen, close }: SendBackFoldProps): ReactElement {
	return (
		<Collapsible open={isOpen} data-tasks-fold="">
			<CollapsibleContent>{isOpen ? <SendBackForm card={card} close={close} /> : null}</CollapsibleContent>
		</Collapsible>
	);
}
