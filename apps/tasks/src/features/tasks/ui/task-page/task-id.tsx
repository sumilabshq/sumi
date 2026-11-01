import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton, copyText } from "@widgetarium/kit";

export interface TaskIdProps {
	readonly id: string;
}

const COPY_ID = "Copy task id";
const COPIED = "Copied";

export function TaskId({ id }: TaskIdProps): ReactElement {
	const [isCopied, setCopied] = useState(false);
	return (
		<span className="wg-tasks-id wg-tasks-mono" data-tasks-id="">
			{id}
			<span className="wg-tasks-id-copy">
				<IconButton
					variant="ghost"
					size="xs"
					label={isCopied ? COPIED : COPY_ID}
					isDone={isCopied}
					data-tasks-copy-id=""
					onClick={() => void copyText(id).then(setCopied)}
				>
					<Icon name={isCopied ? "check" : "copy"} size={12} />
				</IconButton>
			</span>
		</span>
	);
}
