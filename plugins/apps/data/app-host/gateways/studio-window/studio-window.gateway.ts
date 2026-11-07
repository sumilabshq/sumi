export abstract class StudioWindowGateway {
	abstract windowLabel(): string;
	abstract opensBesideAnother(): boolean;
	abstract keepsPagesAcrossStarts(): boolean;
}
