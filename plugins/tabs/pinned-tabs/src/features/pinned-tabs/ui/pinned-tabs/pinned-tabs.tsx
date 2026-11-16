import { createElement as h, Fragment, useState } from "react";
import type { ReactElement } from "react";
import { usePinActs } from "../../lib/use-pin-acts.js";
import { usePinViews } from "../../lib/use-pin-views.js";
import { PinMenu } from "../pin-menu/pin-menu.js";
import type { PinMenuAt } from "../pin-menu/pin-menu.js";
import { PinTab } from "../pin-tab/pin-tab.js";

export function PinnedTabs(): ReactElement {
	const views = usePinViews().filter(({ place }) => place !== "here");
	const acts = usePinActs();
	const [menu, setMenu] = useState<PinMenuAt | null>(null);
	return (
		<>
			{views.map((view) => (
				<PinTab
					key={view.pin.id}
					view={view}
					acts={acts}
					onMenu={(pointed, event) =>
						setMenu({
							view: pointed,
							x: event.clientX,
							y: event.clientY,
						})
					}
				/>
			))}
			<PinMenu at={menu} acts={acts} onClose={() => setMenu(null)} />
		</>
	);
}
