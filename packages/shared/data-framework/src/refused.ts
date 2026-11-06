export class Refused extends Error {
	constructor(reason: string) {
		super(reason);
		this.name = "Refused";
	}
}

export function refuse(reason: string): never {
	throw new Refused(reason);
}
