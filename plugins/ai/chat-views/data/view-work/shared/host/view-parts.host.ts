export interface ViewPart {
	readonly id: string;
	readonly guide: string;
	readonly css: string;
	readonly script: string;
	readonly transform: ((page: Document) => Promise<void>) | null;
}

export interface ViewTemplate {
	readonly id: string;
	readonly title: string;
	readonly purpose: string;
	readonly html: string;
}

export interface ViewWorkConfig {
	readonly parts: readonly ViewPart[];
	readonly templates: readonly ViewTemplate[];
}
