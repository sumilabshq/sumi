import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import type { AssistantCall } from "@widgetarium/core/engine/assistant-port.js";
import type { TurnStep } from "@widgetarium/assistant/contract";
import type { AddedViews } from "../../lib/added-views.js";
import { CallView } from "../call-view/call-view.js";

type ToolsStep = Extract<TurnStep, { readonly kind: "tools" }>;

export interface CallViewsProps {
	readonly calls: readonly AssistantCall[];
	readonly faces: ToolsStep["faces"];
}

export function callViewsOf(views: AddedViews): (props: CallViewsProps) => ReactElement {
	return function CallViews({ calls, faces }: CallViewsProps): ReactElement {
		return (
			<Fragment>
				{calls.map((call, at) => {
					const name = faces[at]?.view ?? null;
					const view = name === null ? null : views.viewOf(name);
					return view === null ? null : <CallView key={call.ref} call={call} view={view} />;
				})}
			</Fragment>
		);
	};
}
