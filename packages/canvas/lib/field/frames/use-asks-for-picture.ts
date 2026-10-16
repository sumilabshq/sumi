import { useEffect } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { AskForPictureCommand } from "../../../features/pictures/contract.js";

interface PictureAsked {
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
