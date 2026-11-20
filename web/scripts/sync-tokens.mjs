// Copies the generated design tokens from replica/design into the app. Run: npm run tokens
import { copyFileSync } from "node:fs";
const src = new URL("../../replica/design/", import.meta.url);
const dst = new URL("../src/styles/", import.meta.url);
for (const f of ["tokens.css", "tailwind.theme.css", "tokens.json"]) copyFileSync(new URL(f, src), new URL(f, dst));
console.log("synced tokens.css, tailwind.theme.css");
