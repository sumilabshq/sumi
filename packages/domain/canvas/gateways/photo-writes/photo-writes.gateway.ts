export type PhotoWrite = () => Promise<void>;

export abstract class PhotoWritesGateway {
	abstract queuePhotoWrite(app: string, write: PhotoWrite): Promise<void>;
}
