// CDP screenshot rig: mobile viewport, cookie-injected session, one chrome child.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [, , url, out, sessionid, csrftoken, waitMs] = process.argv;
const port = 9333;
const chrome = spawn('google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, '--user-data-dir=/tmp/chrome-prof-' + Date.now(),
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function targetWs() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('chrome did not come up');
}
try {
  const ws = new WebSocket(await targetWs());
  let id = 0; const pend = new Map();
  const send = (method, params={}) => new Promise((res, rej) => {
    const mid = ++id; pend.set(mid, {res, rej});
    ws.send(JSON.stringify({id: mid, method, params}));
  });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id).res(m.result); pend.delete(m.id); }
  };
  await new Promise(r => ws.onopen = r);
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 2, mobile: true});
  await send('Emulation.setUserAgentOverride', {userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
  if (sessionid && sessionid !== '-') {
    for (const [name, value] of [['sessionid', sessionid], ['csrftoken', csrftoken]]) {
      await send('Network.setCookie', {name, value, domain: 'revup.nahalabs.co.za', path: '/', secure: true});
    }
  }
  await send('Page.enable');
  await send('Page.navigate', {url});
  await sleep(parseInt(waitMs || '6000', 10));
  const shot = await send('Page.captureScreenshot', {format: 'png'});
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('saved', out);
} finally {
  chrome.kill('SIGKILL');
}
