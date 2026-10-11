// Node module hooks so a plain script can import the app's own modules:
//  - "@/lib/x" resolves to src/lib/x(.js)  (the Next.js path alias)
//  - extensionless relative imports inside src/ get their .js added
//  - .js files under src/ load as ES modules (the repo has no "type": "module")
// Registered by run.mjs via module.register(); nothing else uses this.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");
const EXTS = [".js", ".mjs", ".jsx"];

function withExtension(p) {
    if (path.extname(p)) return p;
    for (const ext of EXTS) if (fs.existsSync(p + ext)) return p + ext;
    for (const ext of EXTS) if (fs.existsSync(path.join(p, "index" + ext))) return path.join(p, "index" + ext);
    return p;
}

const underSrc = (p) => p === SRC || p.startsWith(SRC + path.sep);

export async function resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
        const p = withExtension(path.join(SRC, specifier.slice(2)));
        return { url: pathToFileURL(p).href, format: "module", shortCircuit: true };
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
        const parentDir = path.dirname(fileURLToPath(context.parentURL));
        if (underSrc(parentDir)) {
            const p = withExtension(path.resolve(parentDir, specifier));
            return { url: pathToFileURL(p).href, format: "module", shortCircuit: true };
        }
    }
    return next(specifier, context);
}

export async function load(url, context, next) {
    if (url.startsWith("file:")) {
        const p = fileURLToPath(url);
        if (underSrc(p) && p.endsWith(".js")) {
            return { format: "module", source: fs.readFileSync(p, "utf8"), shortCircuit: true };
        }
    }
    return next(url, context);
}
