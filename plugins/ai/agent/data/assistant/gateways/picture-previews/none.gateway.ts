import { PicturePreviewsGateway } from "./picture-previews.gateway.js";

export class NonePicturePreviewsGateway extends PicturePreviewsGateway {
	previewWithin(preview: string): Promise<string> {
		return Promise.resolve(preview);
	}
}
