import type { ReactElement } from "react";
import { useFlowsWindow } from "../../../../shared/lib/use-flows-window.js";
import { useTrail } from "../../../../shared/lib/use-trail.js";
import { useTrailKeys } from "../../lib/use-trail-keys.js";

export function TrailKeys(): ReactElement | null {
	const trail = useTrail(useFlowsWindow());
	useTrailKeys({ back: trail.goBack, forward: trail.goForward });
	return null;
}
