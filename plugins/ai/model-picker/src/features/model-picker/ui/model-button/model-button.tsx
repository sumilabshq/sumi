import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@widgetarium/kit";
import type { ComposerOptionProps } from "@sumi/chat-plugin";
import { chosenLabelOf } from "../../lib/model-labels.js";
import { ModelMenu } from "./model-menu.js";

const MODEL = "Model";

export function ModelButton({ chat }: ComposerOptionProps): ReactElement | null {
	const shown = useOptionalQuery(assistant.runners.getRunners, { chat }).data ?? null;
	const [isOpen, setOpen] = useState(false);

	if (shown === null || shown.runners.length === 0) {
		return null;
	}

	return (
		<Popover open={isOpen} onOpenChange={setOpen} isPortaled>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="sm" aria-label={MODEL}>
					{chosenLabelOf(shown)}
				</Button>
			</PopoverTrigger>
			<PopoverContent side="top" align="center" className="is-compact sumi-model-menu">
				<ModelMenu chat={chat} shown={shown} onPicked={() => setOpen(false)} />
			</PopoverContent>
		</Popover>
	);
}
