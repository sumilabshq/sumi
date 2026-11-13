import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantCall, CallFace } from "@widgetarium/core/engine/assistant-port.js";
import { callVerbOf } from "../../lib/call-verb.js";
import { knownFaceOf } from "../../lib/known-face.js";

export interface CallNameProps {
	readonly call: AssistantCall;
	readonly face: CallFace;
}

export function CallName({ call, face }: CallNameProps): ReactElement {
	const known = knownFaceOf(call, face);
	return (
		<span className={call.failed ? "wg-studio-ai-call-name is-failed" : "wg-studio-ai-call-name"}>
			<span className="wg-studio-ai-call-verb">{callVerbOf(known, call.answered)}</span>{" "}
			<span className="wg-studio-ai-call-object">{known.object}</span>
		</span>
	);
}
