import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { CallMetaSaid } from "./call-meta.js";
import { CallName } from "./call-name.js";

export interface CallHeadProps {
	readonly call: AssistantCall;
	readonly face: CallFace;
	readonly canOpen: boolean;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

export function CallHead({ call, face, canOpen, isOpen, onToggle }: CallHeadProps): ReactElement {
	return (
		<button
			className="wg-studio-ai-call-head"
			type="button"
			disabled={!canOpen}
			aria-expanded={canOpen ? isOpen : undefined}
			onClick={onToggle}
		>
			<CallName call={call} face={face} />
			{face.meta ? <CallMetaSaid meta={face.meta} /> : null}
		</button>
	);
}
