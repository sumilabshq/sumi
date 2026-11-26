import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@widgetarium/kit";
import type { ComposerOptionProps } from "@sumi/chat-plugin";
import { percentOf } from "../../lib/usage-said.js";
import { UsageMenu } from "./usage-menu.js";
import { UsageRing } from "./usage-ring.js";

const USAGE = "usage";
const USED = "{label}, {used} used";

export function UsageButton({ chat, surface }: ComposerOptionProps): ReactElement | null {
	const meters = useOptionalQuery(assistant.runners.getMeters, { chat }).data ?? [];
	const context = useOptionalQuery(assistant.chat.one, { chat }).data?.session.context ?? null;
	const usage = meters.find(({ key }) => key === USAGE);

	if (usage === undefined || surface === "ask") {
		return null;
	}

	const first = usage.windows[0] ?? null;
	return (
		<Popover isPortaled>
			<PopoverTrigger asChild>
				<Button
					variant="secondary"
					form="round"
					className="sumi-usage-button"
					aria-label={
						first === null ? usage.label : USED.replace("{label}", usage.label).replace("{used}", percentOf(first.used))
					}
				>
					<UsageRing part={first?.used ?? null} />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="is-compact" side="top" align="end">
				<UsageMenu meter={usage} context={context} />
			</PopoverContent>
		</Popover>
	);
}
