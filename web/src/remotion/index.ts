// Render entry (server-side bundle). The fonts are bundled here so renders never depend on
// what the host machine has installed; every frame waits until both faces are loaded.
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import { continueRender, delayRender, registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

const fonts = delayRender("Loading Inter and Manrope");
Promise.all([
  document.fonts.load('800 48px "Manrope Variable"'),
  document.fonts.load('600 30px "Inter Variable"'),
]).then(() => continueRender(fonts), () => continueRender(fonts));

registerRoot(RemotionRoot);
