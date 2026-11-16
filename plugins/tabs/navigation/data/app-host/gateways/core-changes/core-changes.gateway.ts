export abstract class CoreChangesGateway {
	abstract coreChanged(listener: () => void): () => void;
}
