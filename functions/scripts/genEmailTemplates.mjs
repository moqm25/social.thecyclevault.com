// Generates functions/src/shared/emailTemplates.ts from the canonical branded HTML
// in email-templates/*.html so the deployed functions can embed & send them via
// SendGrid (Firebase's own Auth email bodies are locked by Google).
//
// Run after editing any email-templates/*.html:  node scripts/genEmailTemplates.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", ".."); // repo root
const srcDir = resolve(root, "email-templates");
const outFile = resolve(here, "..", "src", "shared", "emailTemplates.ts");

/** Strip the leading instructional <!-- ... --> comment so recipients get clean HTML. */
function loadBody(file) {
	const raw = readFileSync(resolve(srcDir, file), "utf8");
	const i = raw.indexOf("<!DOCTYPE");
	return (i >= 0 ? raw.slice(i) : raw).trim();
}

const reset = loadBody("password-reset.html");
const verify = loadBody("email-verification.html");
const change = loadBody("email-change.html");

const banner = "// GENERATED FILE — do not edit by hand.\n// Source: email-templates/*.html — regenerate via `node scripts/genEmailTemplates.mjs`.\n";
const body =
	banner +
	`export const RESET_PASSWORD_HTML = ${JSON.stringify(reset)};\n\n` +
	`export const VERIFY_EMAIL_HTML = ${JSON.stringify(verify)};\n\n` +
	`export const CHANGE_EMAIL_HTML = ${JSON.stringify(change)};\n`;

writeFileSync(outFile, body, "utf8");
console.log(`Wrote ${outFile}`);
console.log(`  reset=${reset.length}  verify=${verify.length}  change=${change.length} chars`);
