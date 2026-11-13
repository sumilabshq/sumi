import { Scene } from "./scene.js";
import type { Look, MascotScene, SceneIds } from "./scene.js";
import type { OutfitId } from "./outfit.schema.js";
import {
	dressEyeshade,
	dressHome,
	dressNewsboy,
	dressPilot,
	dressPith,
	dressPropeller,
	dressStudy,
	dressTravel,
} from "./caps.js";
import { dressBucket, dressCrown, dressDesign, dressMoney, dressParty, dressToque, dressWizard } from "./crowns.js";
import { dressDev, dressSprout, dressSweatband, dressWriting } from "./props.js";

export interface Outfit {
	readonly name: string;
	readonly job: string;
	readonly isSwaying: boolean;
	readonly dress: (scene: Scene) => void;
}

export interface SceneAsk {
	readonly look: Look;
	readonly time: number;
	readonly ids: SceneIds;
}

export const INK_BODY_PATH =
	"M60 26 C88 26 104 46 104 68 C104 96 86 112 60 112 C34 112 16 96 16 68 C16 44 32 26 60 26Z";

// TRADE-OFF: outfit colours are hex, not kit tokens: every facet is shaded from the hex
export const OUTFITS: Readonly<Record<OutfitId, Outfit>> = {
	bare: { name: "Sumi", job: "No workspace yet", isSwaying: false, dress: dressNothing },
	party: { name: "Default", job: "Party hat", isSwaying: false, dress: dressParty },
	dev: { name: "Development", job: "Headset", isSwaying: false, dress: dressDev },
	propeller: { name: "Development", job: "Propeller cap", isSwaying: true, dress: dressPropeller },
	design: { name: "Design", job: "Beret", isSwaying: false, dress: dressDesign },
	bucket: { name: "Design", job: "Bucket hat", isSwaying: false, dress: dressBucket },
	travel: { name: "Travel", job: "Cap", isSwaying: false, dress: dressTravel },
	pith: { name: "Travel", job: "Pith helmet", isSwaying: false, dress: dressPith },
	pilot: { name: "Travel", job: "Pilot cap and goggles", isSwaying: false, dress: dressPilot },
	writing: { name: "Writing", job: "Scarf and pencil", isSwaying: true, dress: dressWriting },
	newsboy: { name: "Writing", job: "Flat cap and quill", isSwaying: true, dress: dressNewsboy },
	eyeshade: { name: "Data", job: "Eyeshade and glasses", isSwaying: false, dress: dressEyeshade },
	money: { name: "Money", job: "Top hat and monocle", isSwaying: false, dress: dressMoney },
	crown: { name: "Money", job: "Crown", isSwaying: false, dress: dressCrown },
	sprout: { name: "Health", job: "Sprout", isSwaying: true, dress: dressSprout },
	sweatband: { name: "Health", job: "Sweatband", isSwaying: false, dress: dressSweatband },
	study: { name: "Study", job: "Mortarboard", isSwaying: true, dress: dressStudy },
	wizard: { name: "Study", job: "Wizard hat", isSwaying: false, dress: dressWizard },
	home: { name: "Home", job: "Beanie", isSwaying: false, dress: dressHome },
	toque: { name: "Home", job: "Chef toque", isSwaying: false, dress: dressToque },
};

export function sceneOf(outfit: OutfitId, { look, time, ids }: SceneAsk): MascotScene {
	const scene = new Scene(look, time, ids);
	OUTFITS[outfit].dress(scene);
	return scene.finished();
}

function dressNothing(): void {
	return undefined;
}
