import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { Icon, Pressable } from "@widgetarium/kit";
import { CallMetaSaid } from "./call-meta.js";
import { CallName } from "./call-name.js";

export interface CallHeadProps {
	readonly call: AssistantCall;
	readonly face: CallFace;
	readonly canOpen: boolean;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
}

const HEAD_CLASS = "wg-studio-ai-call-head";

export function CallHead({ call, face, canOpen, isOpen, onToggle }: CallHeadProps): ReactElement {
	if (!canOpen) {
		return (
			<div className={HEAD_CLASS}>
				<CallHeadParts call={call} face={face} />
			</div>
		);
	}

	return (
		<Pressable className={HEAD_CLASS} aria-expanded={isOpen} onClick={onToggle}>
			<CallHeadParts call={call} face={face} />
			<Icon
				name="chevron-right"
				size={14}
				className={isOpen ? "wg-studio-ai-tools-chevron is-open" : "wg-studio-ai-tools-chevron"}
			/>
		</Pressable>
	);
}

function CallHeadParts({ call, face }: Pick<CallHeadProps, "call" | "face">): ReactElement {
	return (
		<Fragment>
			<CallName call={call} face={face} />
			{face.meta ? <CallMetaSaid meta={face.meta} /> : null}
			{call.answered ? null : <span className="wg-studio-ai-call-spin" aria-hidden="true" />}
		</Fragment>
	);
}
