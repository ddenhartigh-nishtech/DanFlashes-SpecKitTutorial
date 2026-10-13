/** npm run art:generate — write placeholder SVGs for every seed shirt plus the placeholder. */
import fs from "node:fs";
import path from "node:path";
import { SEED } from "./seed-data";
import { placeholderSvg, shirtSvg } from "./shirt-art";

const MEDIA_ROOT = path.join(process.cwd(), "public", "media");

function write(key: string, svg: string) {
  const file = path.join(MEDIA_ROOT, key);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, svg);
}

write(SEED.placeholder.key, placeholderSvg());
for (const shirt of SEED.shirts)
  write(shirt.image.key, shirtSvg(shirt.slug, shirt.complexity, shirt.style));
console.log(`Wrote ${SEED.shirts.length + 1} SVGs to public/media/`);
