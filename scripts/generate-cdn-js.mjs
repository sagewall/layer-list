import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const inputPath = path.join(repoRoot, "src", "main.ts");
const outputPath = path.join(repoRoot, "cdn", "cdn.js");

const source = await fs.readFile(inputPath, "utf8");
const sourceFile = ts.createSourceFile(
  inputPath,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);

const SIDE_EFFECT_IMPORT_PREFIXES = [
  "@arcgis/map-components/",
  "@esri/calcite-components/",
];

function isSkippedSideEffectImport(specifier) {
  return (
    SIDE_EFFECT_IMPORT_PREFIXES.some((prefix) =>
      specifier.startsWith(prefix),
    ) || specifier === "./style.css"
  );
}

function createArcgisImportLines(importDecl) {
  const moduleSpecifier = importDecl.moduleSpecifier.text;
  const clause = importDecl.importClause;

  if (
    !clause ||
    clause.isTypeOnly ||
    !moduleSpecifier.startsWith("@arcgis/core/")
  ) {
    return [];
  }

  const lines = [];

  if (clause.name && !clause.namedBindings) {
    lines.push(
      `const ${clause.name.text} = await $arcgis.import(${JSON.stringify(moduleSpecifier)});`,
    );
    return lines;
  }

  if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
    lines.push(
      `const ${clause.namedBindings.name.text} = await $arcgis.import(${JSON.stringify(moduleSpecifier)});`,
    );
    return lines;
  }

  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    const names = clause.namedBindings.elements
      .map((el) =>
        el.propertyName
          ? `${el.propertyName.text}: ${el.name.text}`
          : el.name.text,
      )
      .join(", ");

    lines.push(
      `const { ${names} } = await $arcgis.import(${JSON.stringify(moduleSpecifier)});`,
    );
    return lines;
  }

  if (clause.name && clause.namedBindings) {
    const tempVar = `__arcgis_${clause.name.text}`;
    lines.push(
      `const ${tempVar} = await $arcgis.import(${JSON.stringify(moduleSpecifier)});`,
    );
    lines.push(`const ${clause.name.text} = ${tempVar}.default ?? ${tempVar};`);

    if (ts.isNamespaceImport(clause.namedBindings)) {
      lines.push(`const ${clause.namedBindings.name.text} = ${tempVar};`);
    } else if (ts.isNamedImports(clause.namedBindings)) {
      const names = clause.namedBindings.elements
        .map((el) =>
          el.propertyName
            ? `${el.propertyName.text}: ${el.name.text}`
            : el.name.text,
        )
        .join(", ");
      lines.push(`const { ${names} } = ${tempVar};`);
    }
  }

  return lines;
}

const importLines = [];

for (const statement of sourceFile.statements) {
  if (!ts.isImportDeclaration(statement)) {
    continue;
  }

  const moduleSpecifier = statement.moduleSpecifier.text;

  if (isSkippedSideEffectImport(moduleSpecifier)) {
    continue;
  }

  const arcgisLines = createArcgisImportLines(statement);
  if (arcgisLines.length > 0) {
    importLines.push(...arcgisLines);
  }
}

const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;

// Remove all static imports from transpiled output. ArcGIS core imports are rebuilt
// above using $arcgis.import and CDN side-effect imports are intentionally excluded.
const STATIC_IMPORT_RE = /^\s*import\s[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm;
const SIDE_EFFECT_IMPORT_RE = /^\s*import\s+["'][^"']+["'];?\s*$/gm;
let jsBody = transpiled
  .replace(STATIC_IMPORT_RE, "")
  .replace(SIDE_EFFECT_IMPORT_RE, "");
jsBody = jsBody.replace(/^\s*export\s*\{\s*\};?\s*$/gm, "").trimStart();

const output = `${importLines.join("\n")}\n\n// Web components and styles are expected to be loaded via CDN in the host HTML.\n\n${jsBody}`;

await fs.writeFile(outputPath, output, "utf8");
console.log(
  `Generated ${path.relative(repoRoot, outputPath)} from ${path.relative(repoRoot, inputPath)}`,
);
