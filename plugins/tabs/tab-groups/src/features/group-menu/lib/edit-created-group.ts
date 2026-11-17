import { openGroupMenu } from "@sumi/tab-strip-plugin";

type CreatedAnswer =
	| { readonly ok: true; readonly output: { readonly id: string } }
	| { readonly ok: false; readonly reason: string };

export function editCreatedGroup(asked: string): (answer: CreatedAnswer) => void {
	return (answer) => {
		if (!answer.ok) {
			console.warn(`[widgetarium] ${asked} refused: ${answer.reason}`);
			return;
		}

		openGroupMenu(answer.output.id);
	};
}
