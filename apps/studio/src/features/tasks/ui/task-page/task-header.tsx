import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { HeaderButton } from "../../../plate/ui/plate-header/header-button.js";
import { PlateCrumb } from "../../../plate/ui/plate-header/plate-crumb.js";
import { PlateHeaderPart } from "../../../plate/ui/plate-header/plate-header-part.js";
import { BOARD_ADDRESS, useOpenTask } from "../../lib/use-open-task.js";
import { chatLinkOf } from "./chat-link.js";
import { NarrowControls } from "./narrow-controls.js";
import { OpenChatButton } from "./open-chat-button.js";

export interface TaskHeaderProps {
	readonly task: string;
	readonly owner: string | null;
	readonly isNarrow: boolean;
}

const TASKS = "Tasks";

export function TaskHeader({ task, owner, isNarrow }: TaskHeaderProps): ReactElement {
	const openTask = useOpenTask();
	const chatLink = owner === null ? null : chatLinkOf(owner);
	return (
		<Fragment>
			<PlateHeaderPart place="lead">
				<HeaderButton label="Back to the board" icon="chevron-left" onClick={() => openTask(BOARD_ADDRESS)} />
			</PlateHeaderPart>
			<PlateHeaderPart place="crumb">
				{isNarrow ? (
					<span className="wg-tasks-crumb wg-tasks-mono" data-tasks-crumb-id="">
						{task}
					</span>
				) : (
					<span className="wg-tasks-crumb">
						<PlateCrumb
							words={{
								first: TASKS,
								second: task,
							}}
							isPressable={false}
						/>
					</span>
				)}
			</PlateHeaderPart>
			<PlateHeaderPart place="controls">
				{isNarrow ? <NarrowControls chatLink={chatLink} /> : <OpenChatButton chatLink={chatLink} />}
			</PlateHeaderPart>
		</Fragment>
	);
}
