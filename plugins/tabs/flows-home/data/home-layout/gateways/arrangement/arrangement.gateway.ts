import type { Arrangement } from "../../shared/schema/arrangement.schema.js";

export abstract class ArrangementGateway {
	abstract arrangement(): Promise<Arrangement>;
	abstract keepArrangement(patch: Partial<Arrangement>, reason: string): Promise<void>;
	abstract arrangementChanged(listener: () => void): () => void;
}
