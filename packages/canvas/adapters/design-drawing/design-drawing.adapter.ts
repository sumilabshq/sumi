import type { Drawing, PictureTaker } from "../../schema/drawing.schema.js";

export abstract class DesignDrawing {
	abstract readonly pictureOf: PictureTaker | null;
	abstract drawing(): Drawing;
}
