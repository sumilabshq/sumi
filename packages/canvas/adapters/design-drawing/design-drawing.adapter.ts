import type { Drawing, PictureTaker } from "../../shared/schema/drawing.schema.js";

export abstract class DesignDrawing {
	abstract readonly pictureOf: PictureTaker | null;
	abstract drawing(): Drawing;
}
