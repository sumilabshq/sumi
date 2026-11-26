import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useDialog } from "./dialog-context";
import { Button } from "./button";

const CLOSE_LABEL = "Close";

export function ModalCloseButton(): ReactElement {
	const { setOpen } = useDialog();
	return (
		<Button
			shape="square"
			emphasis="ghost"
			icon="x"
			label={CLOSE_LABEL}
			className="wg-kit-modal-close"
			onClick={() => setOpen(false)}
		/>
	);
}
