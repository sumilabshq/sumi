import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface MissingAppProps {
	readonly app: string;
}

const NOT_REGISTERED = "No app named “{app}” stands in this Sumi";

export function MissingApp({ app }: MissingAppProps): ReactElement {
	return (
		<div className="wg-app-missing" data-app-missing={app}>
			<p className="wg-app-missing-said">{NOT_REGISTERED.replace("{app}", app)}</p>
		</div>
	);
}
