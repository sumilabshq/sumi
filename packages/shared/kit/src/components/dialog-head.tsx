import { createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { Button } from "./button";
import type { DialogPanelProps } from "./dialog-panel";
import { ModalIdsContext } from "./modal-ids-context";

const CLOSE_LABEL = "Close";

export function DialogHead({ title, onClose }: Pick<DialogPanelProps, "title" | "onClose">): ReactElement | null {
	const { titleId } = useContext(ModalIdsContext);
	if (!title && !onClose) return null;
	return (
		<header className="wg-kit-dialog-head">
			<span id={titleId} className="wg-kit-dialog-title">
				{title}
			</span>
			{onClose ? (
				<Button shape="square" emphasis="ghost" size="sm" icon="x" label={CLOSE_LABEL} onClick={onClose} />
			) : null}
		</header>
	);
}
