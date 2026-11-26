import { createElement as h, Fragment, useState } from "react";
import type { ReactElement } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { Icon, PartButton, toast } from "@widgetarium/kit";
import { assistant } from "@widgetarium/assistant/contract";
import type { FlowRowFacts } from "../../../../shared/lib/flow-facts.js";
import type { FlowActs } from "../../../../shared/lib/use-flow-acts.js";
import { ConfirmDelete } from "../../../../shared/ui/confirm-delete/confirm-delete.js";

const CLOSE_ICON_PX = 12;

export interface CloseFlowButtonProps {
	readonly flow: FlowRowFacts;
	readonly acts: FlowActs;
}

export function CloseFlowButton({ flow, acts }: CloseFlowButtonProps): ReactElement {
	const [isConfirming, setIsConfirming] = useState(false);
	const stopTurn = useCommand(assistant.chat.stopTurn);
	const runningChats = flow.chats.filter((chat) => chat.status === "running");
	const stopAndArchive = async (): Promise<void> => {
		const stopped = await Promise.all(runningChats.map((chat) => stopTurn.run({ chat: chat.id })));
		const refused = stopped.find((answer) => !answer.ok);

		if (refused && !refused.ok) {
			toast.error("Could not stop the session", { description: refused.reason });
			return;
		}

		acts.archive(flow.id);
	};

	return (
		<Fragment>
			<PartButton
				label="Archive session"
				className="sumi-flows-close"
				onPointerDown={(event) => event.stopPropagation()}
				onClick={(event) => {
					event.stopPropagation();

					if (runningChats.length === 0) {
						acts.archive(flow.id);
						return;
					}

					setIsConfirming(true);
				}}
			>
				<Icon name="x" size={CLOSE_ICON_PX} />
			</PartButton>
			<ConfirmDelete
				isOpen={isConfirming}
				title="Stop and archive this session?"
				description="Sumi is still working in it. Stopping ends the run, and the session moves to Archive."
				confirmLabel="Stop and archive"
				onConfirm={() => void stopAndArchive()}
				onClose={() => setIsConfirming(false)}
			/>
		</Fragment>
	);
}
