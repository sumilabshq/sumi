import { useEffect } from "react";
import { portalLayer } from "@widgetarium/kit";

const STUDIO_PORTAL_CLASS = "is-studio";

let mountedStudios = 0;

export function useStudioPortalClass(): void {
	useEffect(() => {
		mountedStudios += 1;
		portalLayer().classList.add(STUDIO_PORTAL_CLASS);
		return () => {
			mountedStudios -= 1;
			if (mountedStudios === 0) {
				portalLayer().classList.remove(STUDIO_PORTAL_CLASS);
			}
		};
	}, []);
}
