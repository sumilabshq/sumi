import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon } from "@widgetarium/kit";

const NEW_TAB_LABEL = "New tab";

export function NewTabButton({ onOpen }: { readonly onOpen: () => void }): ReactElement {
	return (
		<span className="sumi-strip-new">
			<Button
				shape="square"
				emphasis="ghost"
				data-own-drag=""
				label={NEW_TAB_LABEL}
				title={NEW_TAB_LABEL}
				onClick={onOpen}
			>
				<Icon name="plus" />
			</Button>
		</span>
	);
}
