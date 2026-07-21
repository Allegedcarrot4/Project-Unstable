// Vite plugin for font obfuscation — maps Latin chars to CJK codepoints at build time

import opentype from "opentype.js";
import path from "path";
import fs from "fs";

const CJK_START = 0x4e00;
const LATIN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?@#$%^&*()_+-=[]{}|;':\"/<>~` ";
const MAPPINGS_FILE = "ob-font-mappings.json";
const REVERSE_MAPPINGS_FILE = "ob-font-reverse-mappings.json";
const OBF_FONT_NAME = "UnstableObf";

export function fontObfuscationPlugin() {
  return {
    name: "font-obfuscation",
    enforce: "post",
    async writeBundle(options) {
      const outDir = options.dir || "dist/public";
      const fontSrc = path.resolve(import.meta.dirname, "..", "public", "PlusJakartaSans-Regular.ttf");
      if (!fs.existsSync(fontSrc)) {
        console.warn("[font-obfuscation] Base font not found at", fontSrc, "— skipping");
        return;
      }
      try {
        const font = await opentype.load(fontSrc);
        const mappings = {};
        const reverseMappings = {};
        const glyphs = [];
        for (let i = 0; i < LATIN_CHARS.length; i++) {
          const latin = LATIN_CHARS[i];
          const cjkCode = CJK_START + i;
          const glyph = font.charToGlyph(latin);
          if (glyph) {
            glyph.unicode = cjkCode;
            glyph.name = `uni${cjkCode.toString(16).toUpperCase()}`;
            glyphs.push(glyph);
            mappings[latin] = cjkCode;
            reverseMappings[cjkCode] = latin;
          }
        }
        const obfFont = new opentype.Font({
          familyName: OBF_FONT_NAME,
          styleName: "Regular",
          unitsPerEm: font.unitsPerEm,
          ascender: font.ascender,
          descender: font.descender,
          glyphs: glyphs,
        });
        const ttfPath = path.join(outDir, "unstable-obf.ttf");
        const ttfBuffer = obfFont.toArrayBuffer();
        fs.writeFileSync(ttfPath, Buffer.from(ttfBuffer));
        console.log(`[font-obfuscation] Generated ${ttfPath}`);
        // Write mappings
        fs.writeFileSync(path.join(outDir, MAPPINGS_FILE), JSON.stringify(mappings));
        fs.writeFileSync(path.join(outDir, REVERSE_MAPPINGS_FILE), JSON.stringify(reverseMappings));
        console.log(`[font-obfuscation] Generated mappings`);
      } catch (err) {
        console.warn("[font-obfuscation] Failed:", err.message);
      }
    },
  };
}
