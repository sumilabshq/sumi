import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

const NEW_TAB_LABEL = "New tab";

export function NewTabButton({ onOpen }: { readonly onOpen: () => void }): ReactElement {
	return (
		<button
			type="button"
			className="sumi-strip-new"
			data-own-drag=""
			aria-label={NEW_TAB_LABEL}
			title={NEW_TAB_LABEL}
			onClick={onOpen}
		>
			<Icon name="plus" />
		</button>
	);
}
