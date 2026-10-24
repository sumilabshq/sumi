import { createElement as h } from "react";
import type { ReactElement } from "react";
import { EYE_PATHS, MOUTH_PATHS } from "../../lib/face-shapes.js";
import type { MascotFrame } from "../../lib/mascot-motion.js";
import type { MascotScene, SceneIds } from "../../lib/scene/scene.js";
import { INK_BODY_PATH } from "../../lib/wardrobe/outfits.js";
import type { MascotState } from "../../lib/mascot-state.schema.js";
import { SceneDefs } from "./scene-defs.js";
import { ScenePaths } from "./scene-paths.js";

export interface MascotDrawingProps {
	readonly scene: MascotScene;
	readonly ids: SceneIds;
	readonly frame: MascotFrame;
	readonly state: MascotState;
}

export function MascotDrawing({ scene, ids, frame, state }: MascotDrawingProps): ReactElement {
	return (
		<svg className="wg-mascot-svg" viewBox="0 0 120 120" aria-hidden="true">
			<SceneDefs ids={ids} frame={frame} paints={scene.paints} />
			<ScenePaths items={scene.behind} />
			<path d={INK_BODY_PATH} fill={`url(#${ids.shine})`} />
			<ScenePaths items={scene.hats} />
			<g className="wg-mascot-turn" style={{ transform: scene.leftEye }}>
				<g className="wg-mascot-lid">
					<path className="wg-mascot-eye is-left" d={EYE_PATHS[state]} />
				</g>
			</g>
			<g className="wg-mascot-turn" style={{ transform: scene.rightEye }}>
				<g className="wg-mascot-lid">
					<path className="wg-mascot-eye is-right" d={EYE_PATHS[state]} />
				</g>
			</g>
			<g className="wg-mascot-turn" style={{ transform: scene.mouth }}>
				<path className="wg-mascot-mouth" d={MOUTH_PATHS[state]} />
			</g>
			<ScenePaths items={scene.ahead} />
		</svg>
	);
}
