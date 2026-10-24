import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CallFace } from "@widgetarium/core/engine/assistant-port.js";

export function CallName({ face }: { readonly face: CallFace }): ReactElement {
	return (
		<span className="wg-studio-ai-call-name">
			{face.verb === "" ? null : `${face.verb} `}
			{face.isCodeObject ? <code className="wg-studio-ai-code">{face.object}</code> : face.object}
		</span>
	);
}
