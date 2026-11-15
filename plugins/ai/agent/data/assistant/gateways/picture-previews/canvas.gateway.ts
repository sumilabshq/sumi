import { PicturePreviewsGateway } from "./picture-previews.gateway.js";

const NOT_DRAWN = "The picture could not be drawn smaller: this host gives no 2d canvas.";
const NOT_READ = "The smaller picture could not be read back.";
const JPEG = "image/jpeg";
const PNG = "image/png";

export class CanvasPicturePreviewsGateway extends PicturePreviewsGateway {
	async previewWithin(preview: string, largestEdge: number): Promise<string> {
		const whole = await (await fetch(preview)).blob();
		const bitmap = await createImageBitmap(whole);

		try {
			const scale = largestEdge / Math.max(bitmap.width, bitmap.height);

			if (scale >= 1) {
				return preview;
			}

			return await dataUrlOf(await scaledBlobOf(bitmap, scale, whole.type === JPEG ? JPEG : PNG));
		} finally {
			bitmap.close();
		}
	}
}

function scaledBlobOf(bitmap: ImageBitmap, scale: number, type: string): Promise<Blob> {
	const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
	const context = canvas.getContext("2d");

	if (context === null) {
		return Promise.reject(new Error(NOT_DRAWN));
	}

	context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	return canvas.convertToBlob({ type });
}

function dataUrlOf(blob: Blob): Promise<string> {
	return new Promise((read, fail) => {
		const reader = new FileReader();
		reader.onload = () => (typeof reader.result === "string" ? read(reader.result) : fail(new Error(NOT_READ)));
		reader.onerror = () => fail(reader.error ?? new Error(NOT_READ));
		reader.readAsDataURL(blob);
	});
}
