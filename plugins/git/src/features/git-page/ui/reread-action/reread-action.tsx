import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RereadGitCommand } from "@sumi/git";
import { useTabHeader } from "@sumi/sumi-host-plugin";
import { useCommand } from "@widgetarium/data-framework";

const REFRESH = "Refresh";

export function RereadAction(): ReactElement {
	const { Action } = useTabHeader();
	const reread = useCommand(RereadGitCommand);
	return <Action label={REFRESH} icon="rotate-cw" onPress={() => void reread.run()} />;
}
