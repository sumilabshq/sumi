import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, tooltipMarks } from "@widgetarium/kit";

const MANAGE_PROVIDERS = "Manage providers";

export function ManageProvidersButton({ onManage }: { readonly onManage: () => void }): ReactElement {
	return (
		<button
			type="button"
			className="sumi-pane-head-button"
			aria-label={MANAGE_PROVIDERS}
			onClick={onManage}
			{...tooltipMarks({ said: MANAGE_PROVIDERS, side: "top" })}
		>
			<Icon name="settings-2" size={16} />
		</button>
	);
}
