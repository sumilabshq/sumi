import { useEffect } from "react";
import { useCommand } from "@widgetarium/core/mediator";
import { AskForPictureCommand } from "../../../requests/ask-for-picture.command.js";

export interface PictureAsked {
	readonly node: HTMLDivElement | null;
	readonly frame: string;
	readonly pictureKey: string;
	readonly isAsked: boolean;
}

export function useAsksForPicture({ node, frame, pictureKey, isAsked }: PictureAsked): void {
	const ask = useCommand(AskForPictureCommand);
	useEffect(() => {
		if (isAsked && node) void ask.run({ frame, key: pictureKey, node });
	}, [isAsked, node, frame, pictureKey]);
}
