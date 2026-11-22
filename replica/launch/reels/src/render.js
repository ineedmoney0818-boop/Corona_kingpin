// node render.js name [stillAt]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const [name, still] = process.argv.slice(2);
const FPS = 30;
(async () => {
  const tl = JSON.parse(fs.readFileSync(`out/${name}.json`));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + __dirname + '/stage.html');
  await p.evaluate(x => window.setTL(x), tl);
  await p.evaluate(() => Promise.all([...document.images].map(i => i.decode?.().catch(() => {}))));
  if (still !== undefined) {
    for (const s of still.split(',')) { await p.evaluate(t => window.render(t), +s); await p.waitForTimeout(150);
      await p.screenshot({ path: `out/${name}_${s}.png` }); }
    await b.close(); return;
  }
  // preload images
  await p.evaluate(() => { for (const n of ['home', 'pricing']) { const i = new Image(); i.src = `shots/${n}.png`; } });
  await p.waitForTimeout(1500);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-i', `out/${name}.wav`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '19', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', `out/${name}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.ceil(tl.dur * FPS);
  for (let i = 0; i < N; i++) {
    await p.evaluate(t => window.render(t), i / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await b.close(); console.log(name, N, 'frames');
})();
