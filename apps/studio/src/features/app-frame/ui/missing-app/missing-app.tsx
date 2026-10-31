import { createElement as h } from "react";
import type { ReactElement } from "react";
import { AppRegistryQuery, InstallAppCommand } from "@widgetarium/app-installer";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { Button } from "@widgetarium/kit";

export interface MissingAppProps {
	readonly app: string;
	readonly problem: string | null;
}

const NOT_INSTALLED = "“{app}” is not installed";
const NOT_LISTED = "No app in the registry has this name.";
const INSTALL = "Install {app}";

export function MissingApp({ app, problem }: MissingAppProps): ReactElement {
	const isListed = useQuery(AppRegistryQuery).data.apps.some(({ id }) => id === app);
	const install = useCommand(InstallAppCommand);
	return (
		<div className="wg-app-missing" data-app-missing={app}>
			<p className="wg-app-missing-said">{NOT_INSTALLED.replace("{app}", app)}</p>
			{problem === null ? null : <p className="wg-app-missing-problem">{problem}</p>}
			{isListed ? (
				<Button variant="accent" size="m" onClick={() => void install.run({ id: app })}>
					{INSTALL.replace("{app}", app)}
				</Button>
			) : (
				<p className="wg-app-missing-problem">{NOT_LISTED}</p>
			)}
		</div>
	);
}
