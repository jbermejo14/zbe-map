// Tailwind 4 se integra por PostCSS. El primer plugin solo actúa en Windows: el escáner WASM
// de Tailwind no lee rutas C:\ y este plugin le pasa las clases de app/, components/ y lib/.
const config = {
  plugins: ["./postcss-tailwind-windows.cjs", "@tailwindcss/postcss"],
};

export default config;
