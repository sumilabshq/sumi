export interface SystemScheme {
	readonly matches: boolean;
	addEventListener(type: "change", listener: () => void): void;
	removeEventListener(type: "change", listener: () => void): void;
}

export interface AppearanceConfig {
	readonly systemScheme: SystemScheme;
}
