/**
 * Build a labeled contact sheet of every image in uploads/products/* so the
 * catalog can be classified visually in one pass.
 * Usage: node scripts/contactSheet.js
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "uploads", "products");
const TH = 130; // thumb size
const COLS = 11;
const LABEL_H = 26;

(async () => {
  const dirs = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();

  const entries = [];
  const loose = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((f) => f.isFile() && /\.(png|jpe?g|webp|avif|jfif)$/i.test(f.name))
    .map((f) => f.name);
  console.log(`DEBUG dirs=${dirs.length} loose=${loose.length}`);
  for (const f of loose) entries.push({ dir: "(root)", file: f, p: path.join(ROOT, f) });
  for (const dir of dirs) {
    const dp = path.join(ROOT, dir);
    let files;
    try {
    files = fs.readdirSync(dp).filter((f) => /\.(png|jpe?g|webp|avif|jfif)$/i.test(f));
    } catch (err) {
      console.log(`DEBUG readdir(${dp}) failed: ${err.message}`);
      continue;
    }
    console.log(`DEBUG ${dir} -> ${files.length} image files`);
    for (const f of files) {
      entries.push({ dir, file: f, p: path.join(dp, f) });
    }
  }
  entries.sort((a, b) => a.dir.localeCompare(b.dir) || a.file.localeCompare(b.file, undefined, { numeric: true }));

  const rows = Math.ceil(entries.length / COLS);
  const W = COLS * TH;
  const H = rows * (TH + LABEL_H);

  const composites = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * TH;
    const y = row * (TH + LABEL_H);
    try {
      const buf = await sharp(e.p).resize(TH, TH, { fit: "cover" }).toBuffer();
      composites.push({ input: buf, left: x, top: y + LABEL_H });
    } catch (err) {
      composites.push({
        input: await sharp({ create: { width: TH, height: TH, channels: 3, background: "#ff4d4f" } }).png().toBuffer(),
        left: x,
        top: y + LABEL_H,
      });
    }
    const label = Buffer.from(
      `<svg width="${TH}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#111"/>
        <text x="6" y="17" font-family="monospace" font-size="11" fill="#fff">${i}</text>
        <text x="30" y="17" font-family="monospace" font-size="9" fill="#9ad">${e.dir}/${e.file}</text>
      </svg>`
    );
    composites.push({ input: label, left: x, top: y });
  }

  const out = path.join(__dirname, "..", "uploads", "contact-sheet.png");
  await sharp({ create: { width: W, height: H, channels: 3, background: "#222" } })
    .composite(composites)
    .png()
    .toFile(out);
  console.log(`${entries.length} images -> ${out}`);
  entries.forEach((e, i) => console.log(`${String(i).padStart(3)} ${e.dir}/${e.file}`));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
