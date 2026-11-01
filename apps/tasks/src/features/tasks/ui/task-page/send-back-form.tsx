import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { TaskCard } from "@widgetarium/tasks";
import { Button, TextArea } from "@widgetarium/kit";
import { useSendBack } from "../../lib/use-send-back.js";

export interface SendBackFormProps {
	readonly card: TaskCard;
	readonly close: () => void;
}

const NOTE_PLACEHOLDER = "What is wrong, and what should change?";
const NOTE_MOST = 500;

export function SendBackForm({ card, close }: SendBackFormProps): ReactElement {
	const sendBack = useSendBack(card);
	const [note, setNote] = useState("");
	const isEmpty = note.trim() === "";
	return (
		<form
			className="wg-tasks-send-back"
			data-tasks-send-back=""
			onSubmit={(event) => {
				event.preventDefault();
				void sendBack.run(note.trim()).then((isSent) => isSent && close());
			}}
		>
			<TextArea
				block
				aria-label={NOTE_PLACEHOLDER}
				placeholder={NOTE_PLACEHOLDER}
				maxLength={NOTE_MOST}
				value={note}
				autoFocus
				onChange={(event) => setNote(event.target.value)}
			/>
			<div className="wg-tasks-send-back-acts">
				<Button variant="secondary" size="s" data-tasks-send-back-cancel="" onClick={close}>
					Cancel
				</Button>
				<Button type="submit" variant="primary" size="s" disabled={isEmpty} isLoading={sendBack.isRunning}>
					Send back
				</Button>
			</div>
		</form>
	);
}
