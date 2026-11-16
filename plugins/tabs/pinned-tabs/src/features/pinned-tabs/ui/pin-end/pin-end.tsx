import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

const END_PX = 14;
const UNPIN_LABEL = "Unpin tab";

export function PinEnd({ onUnpin }: { readonly onUnpin: () => void }): ReactElement {
	return (
		<button
			type="button"
			className="sumi-strip-tab-close sumi-pin-end"
			aria-label={UNPIN_LABEL}
			title={UNPIN_LABEL}
			onPointerDown={(event) => event.stopPropagation()}
			onClick={(event) => {
				event.stopPropagation();
				onUnpin();
			}}
		>
			<span className="sumi-pin-mark">
				<Icon name="pin" size={END_PX} />
			</span>
			<span className="sumi-pin-unmark">
				<Icon name="pin-off" size={END_PX} />
			</span>
		</button>
	);
}
