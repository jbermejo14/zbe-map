import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const MIN_TEXT_CONTRAST = 4.5;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const DGT_BADGES = ['cero', 'eco', 'c', 'b', 'sin'];

const globalsCss = readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf-8').replace(/\r\n/g, '\n');

const LIGHT_THEME_BLOCK = /:root\s*,\s*\[data-theme="light"\]\s*\{([^}]*)\}/;
const DARK_THEME_BLOCK = /\[data-theme="dark"\]\s*\{([^}]*)\}/;
// Bloque de constantes: el único `:root {` sin lista de selectores.
const CONSTANTS_BLOCK = /(?:^|\n):root\s*\{([^}]*)\}/;
const RGBA_COLOR = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/;

function uiBlock(blockPattern: RegExp): string {
  const match = blockPattern.exec(globalsCss);
  assert.ok(match, `No se encuentra el bloque ${blockPattern} en globals.css`);
  return match[1];
}

/** Extrae las variables de color hexadecimales del bloque que casa con `blockPattern`. */
function uiReadHexTokens(blockPattern: RegExp): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const token of uiBlock(blockPattern).matchAll(/(--[a-z-]+):\s*(#[0-9a-fA-F]{6});/g)) {
    tokens[token[1]] = token[2];
  }
  return tokens;
}

function uiChannelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function uiLuminance(hex: string): number {
  assert.match(hex, HEX_COLOR);
  const [red, green, blue] = [1, 3, 5].map((start) => uiChannelToLinear(parseInt(hex.slice(start, start + 2), 16)));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function uiContrast(foreground: string, background: string): number {
  const [lighter, darker] = [uiLuminance(foreground), uiLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function uiAssertContrast(foreground: string, background: string, description: string): void {
  const ratio = uiContrast(foreground, background);
  assert.ok(ratio >= MIN_TEXT_CONTRAST, `${description}: ${ratio.toFixed(2)}`);
}

const THEME_BLOCKS: Record<string, RegExp> = { claro: LIGHT_THEME_BLOCK, oscuro: DARK_THEME_BLOCK };
const THEMES: Record<string, Record<string, string>> = {
  claro: uiReadHexTokens(LIGHT_THEME_BLOCK),
  oscuro: uiReadHexTokens(DARK_THEME_BLOCK)
};
const CONSTANTS = uiReadHexTokens(CONSTANTS_BLOCK);

const TEXT_TOKENS = ['--text-primary', '--text-secondary', '--text-muted'];
const SURFACE_TOKENS = ['--bg-body', '--bg-surface', '--bg-surface-elevated'];
const STATE_TOKENS = ['--positive', '--negative', '--warning'];

for (const [themeName, tokens] of Object.entries(THEMES)) {
  test(`contraste: texto sobre fondos en tema ${themeName}`, () => {
    for (const text of TEXT_TOKENS) {
      for (const surface of SURFACE_TOKENS) {
        uiAssertContrast(tokens[text], tokens[surface], `${text} sobre ${surface} en tema ${themeName}`);
      }
    }
  });

  test(`contraste: acento sobre fondo y superficies en tema ${themeName}`, () => {
    for (const surface of SURFACE_TOKENS) {
      uiAssertContrast(tokens['--accent-primary'], tokens[surface], `--accent-primary sobre ${surface} en tema ${themeName}`);
    }
  });

  test(`contraste: colores de estado sobre fondo y superficies en tema ${themeName}`, () => {
    for (const state of STATE_TOKENS) {
      for (const surface of SURFACE_TOKENS) {
        uiAssertContrast(tokens[state], tokens[surface], `${state} sobre ${surface} en tema ${themeName}`);
      }
    }
  });
}

/** Lee un token de color con alfa (rgba) del bloque indicado. */
function uiReadRgbaToken(blockPattern: RegExp, name: string): { channels: number[]; alpha: number } {
  const declaration = new RegExp(`${name}:\\s*([^;]+);`).exec(uiBlock(blockPattern));
  assert.ok(declaration, `No se encuentra ${name}`);
  const parts = RGBA_COLOR.exec(declaration[1].trim());
  assert.ok(parts, `${name} no es un rgba(): ${declaration[1]}`);
  return { channels: parts.slice(1, 4).map(Number), alpha: Number(parts[4]) };
}

/** Mezcla un rgba sobre un fondo opaco hex y devuelve el hex resultante. */
function uiBlend(overlay: { channels: number[]; alpha: number }, backgroundHex: string): string {
  const background = [1, 3, 5].map((start) => parseInt(backgroundHex.slice(start, start + 2), 16));
  const mixed = overlay.channels.map((channel, index) => Math.round(channel * overlay.alpha + background[index] * (1 - overlay.alpha)));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

const TINTED_PAIRS = [
  { text: '--positive', tint: '--positive-bg' },
  { text: '--negative', tint: '--negative-bg' },
  { text: '--warning', tint: '--warning-bg' }
];

for (const [themeName, tokens] of Object.entries(THEMES)) {
  test(`contraste: texto de estado sobre fondos teñidos (tag, paneles) en tema ${themeName}`, () => {
    for (const { text, tint } of TINTED_PAIRS) {
      for (const surface of ['--bg-surface', '--bg-surface-elevated']) {
        const background = uiBlend(uiReadRgbaToken(THEME_BLOCKS[themeName], tint), tokens[surface]);
        uiAssertContrast(tokens[text], background, `${text} sobre ${tint} y ${surface} en tema ${themeName}`);
      }
    }
  });

  test(`contraste: acento sobre --accent-subtle en tema ${themeName}`, () => {
    uiAssertContrast(tokens['--accent-primary'], tokens['--accent-subtle'], `--accent-primary sobre --accent-subtle en tema ${themeName}`);
  });
}

test('contraste: --on-accent-text sobre el naranja de botón, su hover y los fondos sólidos de estado', () => {
  for (const background of ['--on-accent-bg', '--on-accent-bg-hover', '--solid-positive', '--solid-negative', '--solid-warning']) {
    uiAssertContrast(CONSTANTS['--on-accent-text'], CONSTANTS[background], `--on-accent-text sobre ${background}`);
  }
});

test('contraste: colores oficiales de las etiquetas DGT con su texto encima', () => {
  for (const badge of DGT_BADGES) {
    const background = CONSTANTS[`--dgt-${badge}`];
    const text = CONSTANTS[`--on-dgt-${badge}`];
    assert.ok(background && text, `Faltan --dgt-${badge} o --on-dgt-${badge} en globals.css`);
    uiAssertContrast(text, background, `--on-dgt-${badge} sobre --dgt-${badge}`);
  }
});

test('contraste: las pastillas dgt-chip usan cada par de tokens DGT', () => {
  for (const badge of DGT_BADGES) {
    const rule = new RegExp(`\\.dgt-chip-${badge}\\s*\\{([^}]*)\\}`).exec(globalsCss);
    assert.ok(rule, `Falta .dgt-chip-${badge}`);
    assert.ok(rule[1].includes(`background-color: var(--dgt-${badge})`));
    assert.ok(rule[1].includes(`color: var(--on-dgt-${badge})`));
  }
});
