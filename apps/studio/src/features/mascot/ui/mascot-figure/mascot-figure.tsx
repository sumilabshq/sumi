import { createElement as h, useId, useMemo } from "react";
import type { ReactElement } from "react";
import { bodyPoseOf, useMascotMotion } from "../../lib/mascot-motion.js";
import type { SceneIds } from "../../lib/scene/scene.js";
import { OUTFITS, sceneOf } from "../../lib/wardrobe/outfits.js";
import type { MascotState } from "../../lib/mascot-state.schema.js";
import type { OutfitId } from "../../lib/outfit.schema.js";
import type { MascotTouchHandlers } from "../../lib/mascot-state.js";
import { MascotDrawing } from "./mascot-drawing.js";

export interface MascotFigureProps {
	readonly outfit: OutfitId;
	readonly size: number;
	readonly state: MascotState;
	readonly touchHandlers?: MascotTouchHandlers;
}

const STAGE_PX = 180;

export function MascotFigure({ outfit, size, state, touchHandlers }: MascotFigureProps): ReactElement {
	const worn = OUTFITS[outfit];
	const { root, frame } = useMascotMotion({ state, isSwaying: worn.isSwaying });
	const ids = useSceneIds();
	const scene = useMemo(() => sceneOf(outfit, { look: frame.look, time: frame.time, ids }), [outfit, frame, ids]);
	const pose = bodyPoseOf(frame.look, state);
	return (
		<div
			ref={root}
			className={`wg-mascot is-${state}`}
			style={{ width: size, height: size }}
			role="img"
			aria-label={`${worn.name}, ${worn.job}: ${state}`}
			data-state={state}
			data-outfit={outfit}
			{...touchHandlers}
		>
			<div className="wg-mascot-stage" style={{ transform: `scale(${size / STAGE_PX})` }}>
				<div className="wg-mascot-shadow" style={{ transform: pose.shadow }} />
				<div className="wg-mascot-layer" style={{ transform: pose.body }}>
					<div className="wg-mascot-layer wg-mascot-pose">
						<div className="wg-mascot-layer wg-mascot-sway">
							<div className="wg-mascot-layer wg-mascot-breath">
								<MascotDrawing scene={scene} ids={ids} frame={frame} state={state} />
								<span className="wg-mascot-z">z</span>
								<span className="wg-mascot-q">?</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function useSceneIds(): SceneIds {
	const base = useId().replace(/[^a-zA-Z0-9]/g, "");
	return useMemo(
		() => ({ paint: `wg-mascot-${base}-g`, shine: `wg-mascot-${base}-s`, clip: `wg-mascot-${base}-c` }),
		[base],
	);
}
