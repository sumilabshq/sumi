import { createElement as h } from "react";
import type { ReactElement } from "react";
import { withKeyHint } from "./alert-dialog-key";
import { DialogClose } from "./dialog-close";
import type { DialogCloseProps } from "./dialog-close";

export function AlertDialogAction({ children, ...props }: DialogCloseProps): ReactElement {
	return (
		<DialogClose variant="default" {...props} data-slot="alert-dialog-action">
			{withKeyHint(children, "↵", props.asChild)}
		</DialogClose>
	);
}
