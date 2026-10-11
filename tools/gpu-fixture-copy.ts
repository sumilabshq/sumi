export type Tone = "formal" | "casual";
export type Direction = "es-en" | "en-es";

export interface Recent {
	readonly source: string;
	readonly target: string;
	readonly pair: string;
	readonly when: string;
}

export const SOURCE: Readonly<Record<Direction, string>> = {
	"es-en":
		"Hola Marta, ¿podrías enviarme el informe trimestral antes del viernes? Quiero revisarlo con el equipo antes de la reunión con el cliente. Muchas gracias.",
	"en-es":
		"Hi Marta, could you send me the quarterly report before Friday? I want to review it with the team before the meeting with the client. Thank you very much.",
};

export const TRANSLATION: Readonly<Record<Direction, Readonly<Record<Tone, string>>>> = {
	"es-en": {
		formal:
			"Dear Marta, could you please send me the quarterly report before Friday? I would like to review it with the team before our meeting with the client. Thank you very much.",
		casual:
			"Hi Marta, can you send me the quarterly report before Friday? I want to go over it with the team before we meet the client. Thanks a lot.",
	},
	"en-es": {
		formal:
			"Estimada Marta: ¿podría enviarme el informe trimestral antes del viernes? Me gustaría revisarlo con el equipo antes de la reunión con el cliente. Muchas gracias.",
		casual:
			"Hola Marta, ¿me mandas el informe trimestral antes del viernes? Quiero repasarlo con el equipo antes de vernos con el cliente. Mil gracias.",
	},
};

export const LANGUAGE: Readonly<Record<Direction, readonly [string, string]>> = {
	"es-en": ["Spanish", "English"],
	"en-es": ["English", "Spanish"],
};

export const FIRST_RECENT: readonly Recent[] = [
	{
		source: "¿Dónde está la estación de tren más cercana?",
		target: "Where is the nearest train station?",
		pair: "ES → EN",
		when: "2m ago",
	},
	{
		source: "Me gustaría reservar una mesa para cuatro.",
		target: "I would like to book a table for four.",
		pair: "ES → EN",
		when: "18m ago",
	},
	{
		source: "El paquete llegará el martes por la mañana.",
		target: "The package will arrive on Tuesday morning.",
		pair: "ES → EN",
		when: "1h ago",
	},
	{
		source: "Can we move the meeting to three?",
		target: "¿Podemos mover la reunión a las tres?",
		pair: "EN → ES",
		when: "3h ago",
	},
	{
		source: "Gracias por tu paciencia con el retraso.",
		target: "Thanks for your patience with the delay.",
		pair: "ES → EN",
		when: "Yesterday",
	},
	{
		source: "La factura vence a fin de mes.",
		target: "The invoice is due at the end of the month.",
		pair: "ES → EN",
		when: "2d ago",
	},
];
