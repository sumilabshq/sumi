import { createElement as h } from "react";
import type { ReactElement } from "react";
import { HeaderButton } from "../features/plate/ui/header-button.js";
import { PlateHeaderPart } from "../features/plate/ui/plate-header-part.js";
import type { WebPageControls } from "./use-web-page.js";

export function BrowserControls({ controls }: { readonly controls: WebPageControls }): ReactElement {
	return (
		<PlateHeaderPart place="controls">
			<HeaderButton label="Reload" icon="rotate-cw" aria-busy={controls.shown.isLoading} onClick={controls.reload} />
		</PlateHeaderPart>
	);
}
