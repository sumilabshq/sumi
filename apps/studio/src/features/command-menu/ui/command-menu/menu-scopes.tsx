import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Scope } from "@widgetarium/command-menu";

export interface MenuScopesProps {
	readonly scope: Scope;
	readonly onScope: (scope: Scope) => void;
}

const SCOPES: readonly (readonly [Scope, string, string])[] = [
	["all", "All", "⌘1"],
	["tabs", "Tabs", "⌘2"],
	["chats", "Chats", "⌘3"],
	["apps", "Apps", "⌘4"],
	["workspaces", "Workspaces", "⌘5"],
];
const LOOK_IN = "Look in";

export function MenuScopes({ scope, onScope }: MenuScopesProps): ReactElement {
	return (
		<div className="wg-cm-scopes" role="tablist" aria-label={LOOK_IN}>
			{SCOPES.map(([id, label, keys]) => (
				<button
					key={id}
					type="button"
					role="tab"
					className="wg-cm-scope"
					aria-selected={id === scope}
					title={keys}
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => onScope(id)}
				>
					{label}
				</button>
			))}
		</div>
	);
}
