import type { IToolInputSchema } from "./types.js";

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

export function validateToolInput(
	input: string,
	schema: IToolInputSchema,
): ValidationResult {
	const errors: string[] = [];
	let parsed: Record<string, unknown>;

	try {
		parsed = JSON.parse(input) as Record<string, unknown>;
	} catch {
		return { valid: false, errors: ["Input is not valid JSON."] };
	}

	for (const [field, def] of Object.entries(schema.fields)) {
		const value = parsed[field];

		if (def.required !== false && value === undefined) {
			errors.push(`Missing required field: "${field}".`);
			continue;
		}

		if (value !== undefined && typeof value !== def.type) {
			errors.push(
				`Field "${field}" must be of type ${def.type}, got ${typeof value}.`,
			);
		}
	}

	return { valid: errors.length === 0, errors };
}
