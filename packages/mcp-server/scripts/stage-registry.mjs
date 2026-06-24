import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");
const repoRoot = resolve(pkgRoot, "..", "..");
const bundleDir = join(pkgRoot, "bundle");
const componentsSrc = join(repoRoot, "packages", "library", "src", "components");
const componentsOut = join(bundleDir, "components");

function copySources(dir, outDir) {
  mkdirSync(outDir, { recursive: true });
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const srcPath = join(dir, entry.name);
    const destPath = join(outDir, entry.name);
    if (entry.isDirectory()) {
      copySources(srcPath, destPath);
      continue;
    }
    if (entry.name.endsWith(".tsx")) {
      writeFileSync(destPath.replace(/\.tsx$/, ".source"), readFileSync(srcPath, "utf8"));
      continue;
    }
    cpSync(srcPath, destPath);
  }
}

rmSync(bundleDir, { recursive: true, force: true });
mkdirSync(bundleDir, { recursive: true });
cpSync(join(repoRoot, "registry.json"), join(bundleDir, "registry.json"));
copySources(componentsSrc, componentsOut);

console.log(`Staged registry bundle at ${bundleDir}`);
