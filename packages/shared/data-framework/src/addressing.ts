export interface Addressable {
	readonly prefix: string | null;
	readonly name: string;
}

export type Addressing<T> =
	| {
			readonly kind: "found";
			readonly target: T;
	  }
	| {
			readonly kind: "none";
	  }
	| {
			readonly kind: "ambiguous";
			readonly reason: string;
	  };

export const NOT_ADDRESSED: Addressing<never> = {
	kind: "none",
};
const AMBIGUOUS =
	"{name} is served by {candidates}, and no prefix picks one: send it from a module of one of them, or import the contract with its prefix";

export function addressingOf<T extends Addressable>(
	name: string,
	candidates: readonly T[],
	senderPrefix: string | null,
): Addressing<T> {
	const picked = pickedOf(candidates, senderPrefix);

	if (picked !== undefined) {
		return {
			kind: "found",
			target: picked,
		};
	}

	if (candidates.length === 0) {
		return NOT_ADDRESSED;
	}

	return {
		kind: "ambiguous",
		reason: AMBIGUOUS.replace("{name}", name).replace("{candidates}", candidates.map((each) => each.name).join(", ")),
	};
}

function pickedOf<T extends Addressable>(candidates: readonly T[], senderPrefix: string | null): T | undefined {
	const own = senderPrefix === null ? undefined : candidates.find(({ prefix }) => prefix === senderPrefix);
	return (
		own ?? candidates.find(({ prefix }) => prefix === null) ?? (candidates.length === 1 ? candidates[0] : undefined)
	);
}
