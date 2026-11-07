import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ReloadWebPageCommand, WebPageQuery } from "@sumi/contract";
import { useTabHeader } from "@sumi/sumi-host-plugin";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";

export interface ReloadPageActionProps {
	readonly tabId: string;
}

export function ReloadPageAction({ tabId }: ReloadPageActionProps): ReactElement {
	const { Action } = useTabHeader();
	const page = useOptionalQuery(WebPageQuery, { tab: tabId }).data;
	const reload = useCommand(ReloadWebPageCommand);
	return (
		<Action
			label="Reload"
			icon="rotate-cw"
			isBusy={page?.isLoading === true}
			isOff={page === null || page === undefined}
			onPress={() => void reload.run({ tab: tabId })}
		/>
	);
}
