import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RetryAppVersionCommand } from "@widgetarium/app-installer";
import { useCommand } from "@widgetarium/core/requests";
import { Button } from "@widgetarium/kit";

export interface FailedAppProps {
	readonly app: string;
	readonly version: string;
	readonly problem: string | null;
}

const FAILED = "{app} {version} did not start";
const TRY_AGAIN = "Try again";

export function FailedApp({ app, version, problem }: FailedAppProps): ReactElement {
	const retry = useCommand(RetryAppVersionCommand);
	return (
		<div className="wg-app-missing" data-app-missing={app} data-app-failed={version}>
			<p className="wg-app-missing-said">{FAILED.replace("{app}", app).replace("{version}", version)}</p>
			{problem === null ? null : <p className="wg-app-missing-problem">{problem}</p>}
			<Button variant="accent" size="m" onClick={() => void retry.run({ id: app, version })}>
				{TRY_AGAIN}
			</Button>
		</div>
	);
}
