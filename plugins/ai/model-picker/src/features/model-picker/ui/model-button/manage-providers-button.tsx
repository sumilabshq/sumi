import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, IconButton, tooltipMarks } from "@widgetarium/kit";

const MANAGE_PROVIDERS = "Manage providers";

export function ManageProvidersButton({ onManage }: { readonly onManage: () => void }): ReactElement {
	return (
		<IconButton
			variant="ghost"
			size="xs"
			className="sumi-pane-head-button"
			label={MANAGE_PROVIDERS}
			onClick={onManage}
			{...tooltipMarks({ said: MANAGE_PROVIDERS, side: "top" })}
		>
			<Icon name="settings-2" size={16} />
		</IconButton>
	);
}
