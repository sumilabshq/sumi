import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button, Icon, tooltipMarks } from "@widgetarium/kit";

const MANAGE_PROVIDERS = "Manage providers";

export function ManageProvidersButton({ onManage }: { readonly onManage: () => void }): ReactElement {
	return (
		<Button
			shape="square"
			emphasis="ghost"
			size="xs"
			className="sumi-pane-head-button"
			label={MANAGE_PROVIDERS}
			onClick={onManage}
			{...tooltipMarks({ said: MANAGE_PROVIDERS, side: "top" })}
		>
			<Icon name="settings-2" size={16} />
		</Button>
	);
}
