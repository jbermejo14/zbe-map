const fs = require("node:fs");
const path = require("node:path");

const SOURCE_DIRECTORIES = ["app", "components", "lib"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mdx", ".html"]);
// Caracteres admitidos en una clase de Tailwind. Se excluyen comillas, barra invertida
// y llaves para no romper la cadena de @source inline("...") ni provocar expansiones.
const CANDIDATE_PATTERN = /[A-Za-z0-9_:/.\-[\]%#!@(),=&>*+~]+/g;
const GLOBAL_STYLESHEET = "globals.css";

function listSourceFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(fullPath));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

// Un token con paréntesis o corchetes sin cerrar hace que Tailwind descarte el resto de la lista.
function hasBalancedDelimiters(token) {
  let parentheses = 0;
  let brackets = 0;
  for (const character of token) {
    if (character === "(") parentheses += 1;
    else if (character === ")") parentheses -= 1;
    else if (character === "[") brackets += 1;
    else if (character === "]") brackets -= 1;
    if (parentheses < 0 || brackets < 0) return false;
  }
  return parentheses === 0 && brackets === 0;
}

function listAllSourceFiles() {
  return SOURCE_DIRECTORIES.flatMap((directory) => listSourceFiles(path.join(process.cwd(), directory)));
}

function collectCandidates() {
  const candidates = new Set();
  for (const file of listAllSourceFiles()) {
    const content = fs.readFileSync(file, "utf-8");
    for (const token of content.match(CANDIDATE_PATTERN) ?? []) {
      if (hasBalancedDelimiters(token)) candidates.add(token);
    }
  }
  return [...candidates];
}

/**
 * Solo en Windows: el escáner WASM de Tailwind (@tailwindcss/oxide-wasm32-wasi) no puede
 * leer rutas de Windows desde WASI y no detecta ninguna clase. Este plugin extrae las
 * clases desde Node y las declara con @source inline() antes de que actúe Tailwind.
 * En otras plataformas no hace nada (Tailwind usa su escáner nativo).
 */
function tailwindWindowsCandidates() {
  return {
    postcssPlugin: "tailwind-windows-candidates",
    Once(root, { AtRule, result }) {
      if (process.platform !== "win32") return;
      const file = root.source?.input.file ?? "";
      if (path.basename(file) !== GLOBAL_STYLESHEET) return;
      const params = `inline("${collectCandidates().join(" ")}")`;
      root.append(new AtRule({ name: "source", params }));
      for (const directory of SOURCE_DIRECTORIES) {
        result.messages.push({
          type: "dir-dependency",
          plugin: "tailwind-windows-candidates",
          dir: path.join(process.cwd(), directory),
          glob: "**/*",
          parent: file,
        });
      }
    },
  };
}
tailwindWindowsCandidates.postcss = true;

module.exports = tailwindWindowsCandidates;
