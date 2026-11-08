import { createElement as h } from "react";
import type { ReactElement } from "react";
import { webPage } from "@sumi/contract";
import { useTabHeader } from "@sumi/sumi-host-plugin";
import { useCommand, useOptionalQuery } from "@widgetarium/data-framework";

export interface ReloadPageActionProps {
	readonly tabId: string;
}

export function ReloadPageAction({ tabId }: ReloadPageActionProps): ReactElement {
	const { Action } = useTabHeader();
	const page = useOptionalQuery(webPage.pages.one, { tab: tabId }).data;
	const reload = useCommand(webPage.pages.reload);
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
