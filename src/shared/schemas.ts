import { z } from "zod";

export const requiredName = z
	.string({ error: "El nombre es obligatorio" })
	.trim()
	.min(1, "El nombre es obligatorio");

/** A name that becomes an S3 folder or file name: songs and parts. */
export const fileSafeName = requiredName.refine(
	(value) => !/[/\\]/.test(value),
	"El nombre no puede contener / ni \\",
);

export const googleEmail = z
	.string({ error: "Correo inválido" })
	.trim()
	.toLowerCase()
	.pipe(z.email("Correo inválido"));

export function byName<T extends { name: string }>(a: T, b: T): number {
	return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
}

export function sameName(a: string, b: string): boolean {
	return a.localeCompare(b, "es", { sensitivity: "accent" }) === 0;
}
