export abstract class PicturePreviewsGateway {
	abstract previewWithin(preview: string, largestEdge: number): Promise<string>;
}
