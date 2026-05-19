import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import https from 'node:https';

// ===== CONFIG =====
const VOTE_CONCURRENCY = parseInt(process.argv[2]) || 8;
const TOTAL = parseInt(process.argv[3]) || 10000;
const MAX_PROXIES = parseInt(process.argv[4]) || 300;
const CHECK_CONCURRENCY = 300;
const CHECK_TIMEOUT = 3500;
const VOTE_TIMEOUT = 12000;
const MAX_PROXY_FAILURES = 3;
// ==================

const TARGET_URL = '/api/list-vote/f0baf645-b093-4e65-97ca-74b2ae0f08ae/slide-688edef1ec5b';
const TARGET_HOST = 'www.complex.com';

const COOKIES = 'ajs_anonymous_id=51aa497f-ce5f-404f-8dd9-71b4c8c788bc; cf_clearance=txNCoTN.M6I0wsoerwN1p5NdOn93BM5smlO4L_N33A0-1779217734-1.2.1.1-GaxZjaibTMo2eQBkusrk._3kzmb6GlTXlZDJOa10UonnUbFctFP6gxncgcwPaR7uApxCIDI.ZuL2MGB0yEwetNJR6uwHns4OYfiK5m8qYkF0HsV0RMP3YDQZq8RoNG4503EIOAv1gRUn47229utq5KMwBhxdrV65otOxrfNNA9k5Gr3VnAcqays8z2M_ovyrJRbtRBcIrb.CM.JvPBmjfabpp84Z4TFnOoev58ajdBOx0SLuJEvyYosFv004TJWglXcC5EgErqqQT_06m9VyLNM3.6LD7_5Ffmu9iJYsOyh5.9gae1A5ndWd.SK_jrbGU3Ymb042X5fMO7MLEdTj4g; __cf_bm=GwAloaspUOTp8gOUop8rFcvX5vnLaruaaxZeiSL1PbU-1779217734.8321779-1.0.1.1-Xq62ZDgjPkje8.YBycQ9Zn6kkVEGReZ3xQQsm3AYbOaHoYj55tuZAu07p91hAbMFDb4xa2PShcysqDsMfrGaolvhP4L_LbbeXgPFPiu30tnL8UWdopJkdqJilldfS7MY; cmn_daily_article_count=1; g_state={"i_l":0,"i_ll":1779217735189,"i_b":"sjKEjpo5JNPrJmSOhL3kI67TFjVhOytM4RyzZuTvQXg","i_e":{"enable_itp_optimization":19},"i_et":1779217735187}; _pbjs_userid_consent_data=3524755945110770; session=e30%3D.%2B6nXsGO5TVoMb%2F8nOZwlnEP8xp%2FAL8to6buCwkPlIQo; isAuthenticated=false; analytics_session_id=1779217736673; analytics_session_id.last_access=1779217742864';

const HEADERS = {
  'accept': '*/*', 'accept-language': 'en-US,en;q=0.9', 'cache-control': 'no-cache',
  'content-type': 'application/json', 'cookie': COOKIES, 'dnt': '1',
  'origin': 'https://www.complex.com', 'pragma': 'no-cache', 'priority': 'u=1, i',
  'referer': 'https://www.complex.com/pop-culture/a/khal/best-internet-streamers-kick-rumble-twitch-youtube',
  'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
  'sec-ch-ua-arch': '"arm"', 'sec-ch-ua-bitness': '"64"',
  'sec-ch-ua-full-version': '"148.0.7778.168"',
  'sec-ch-ua-full-version-list': '"Chromium";v="148.0.7778.168", "Google Chrome";v="148.0.7778.168", "Not/A)Brand";v="99.0.0.0"',
  'sec-ch-ua-mobile': '?0', 'sec-ch-ua-model': '""', 'sec-ch-ua-platform': '"macOS"',
  'sec-ch-ua-platform-version': '"15.7.7"', 'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors', 'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
};

function randomUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const BODY = JSON.stringify({ vote: 'overrated' });

// ===== PROXY SCRAPING =====

const SCRAPE_SOURCES = [
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
  'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
  'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=10000&country=all',
  'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=all',
  'https://www.proxy-list.download/api/v1/get?type=http',
  'https://www.proxy-list.download/api/v1/get?type=socks4',
  'https://www.proxy-list.download/api/v1/get?type=socks5',
  'https://openproxylist.xyz/http.txt',
  'https://openproxylist.xyz/socks4.txt',
  'https://openproxylist.xyz/socks5.txt',
];

async function scrapeProxies() {
  const all = new Set();
  const results = await Promise.allSettled(
    SCRAPE_SOURCES.map(async (url) => {
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) throw new Error(`${resp.status}`);
      const text = await resp.text();
      const kind = url.includes('socks5') ? 'socks5' : url.includes('socks4') ? 'socks4' : 'http';
      for (const line of text.split(/\r?\n/)) {
        const p = line.trim();
        if (!p || p.startsWith('#')) continue;
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(p)) {
          all.add(kind === 'http' ? p : `${kind}://${p}`);
        }
      }
    })
  );
  const successes = results.filter(r => r.status === 'fulfilled').length;
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  const limited = shuffled.slice(0, MAX_PROXIES);
  console.log(`Scraped ${all.size} unique proxies from ${successes}/${SCRAPE_SOURCES.length} sources, keeping ${limited.length}`);
  return limited;
}

// ===== AGENT CACHE =====

const agentCache = new Map();

function getAgent(proxyStr) {
  let agent = agentCache.get(proxyStr);
  if (agent) return agent;

  if (proxyStr.startsWith('socks4://') || proxyStr.startsWith('socks5://')) {
    agent = new SocksProxyAgent(proxyStr);
  } else if (proxyStr.startsWith('http://') || proxyStr.startsWith('https://')) {
    agent = new HttpsProxyAgent(proxyStr);
  } else {
    agent = new HttpsProxyAgent(`http://${proxyStr}`);
  }
  agentCache.set(proxyStr, agent);
  return agent;
}

// ===== PROXY CHECKING =====

function testProxy(proxyStr) {
  return new Promise((resolve) => {
    const agent = getAgent(proxyStr);
    const url = new URL('https://api.ipify.org?format=json');
    const req = https.get({
      hostname: url.hostname,
      path: url.pathname + url.search,
      agent,
      timeout: CHECK_TIMEOUT,
      rejectUnauthorized: false,
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const ip = JSON.parse(body).ip;
          resolve({ ok: true, ip });
        } catch { resolve({ ok: false }); }
      });
    });
    req.on('error', () => resolve({ ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false }); });
  });
}

async function checkProxies(proxies) {
  console.log(`Checking ${proxies.length} proxies (concurrency: ${CHECK_CONCURRENCY}, timeout: ${CHECK_TIMEOUT}ms)...`);
  const working = [];
  const seen = new Set();
  let done = 0;
  const total = proxies.length;
  let nextReport = 25;

  async function worker() {
    while (true) {
      const proxy = proxies.shift();
      if (!proxy) break;
      const result = await testProxy(proxy);
      done++;
      const pct = (done / total * 100).toFixed(0);
      if (pct >= nextReport) {
        nextReport += 25;
        console.log(`  Checked ${done}/${total} (${pct}%)...`);
      }
      if (result.ok) {
        const key = result.ip;
        if (!seen.has(key)) {
          seen.add(key);
          working.push(proxy);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CHECK_CONCURRENCY }, worker));
  console.log(`${working.length} working proxies found`);
  return working;
}

// ===== VOTING =====

function vote(proxyStr) {
  return new Promise((resolve, reject) => {
    const agent = getAgent(proxyStr);
    const req = https.request({
      hostname: TARGET_HOST,
      path: TARGET_URL,
      method: 'POST',
      headers: { ...HEADERS, 'x-anonymous-id': randomUUID() },
      agent,
      timeout: VOTE_TIMEOUT,
      rejectUnauthorized: false,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body, proxy: proxyStr });
      });
    });
    req.on('error', err => reject({ error: err.message, proxy: proxyStr }));
    req.on('timeout', () => { req.destroy(); reject({ error: 'timeout', proxy: proxyStr }); });
    req.write(BODY);
    req.end();
  });
}

// ===== MAIN =====

let success = 0;
let failed = 0;
const proxyFailCount = new Map();
const badProxies = new Set();

// Atomic counter for assigning vote slots — SharedArrayBuffer + Atomics prevents races
const taskCounterBuf = new SharedArrayBuffer(4);
const taskCounter = new Int32Array(taskCounterBuf);

function pickRandomProxy(proxyPool) {
  const active = proxyPool.filter(p => !badProxies.has(p));
  if (active.length === 0) return null;
  return active[Math.floor(Math.random() * active.length)];
}

async function voter(proxyPool, total) {
  while (true) {
    const idx = Atomics.add(taskCounter, 0, 1);
    if (idx >= total) break;

    const proxy = pickRandomProxy(proxyPool);
    if (!proxy) {
      console.log('[WORKER] No proxies left, stopping');
      break;
    }

    try {
      const result = await vote(proxy);
      success++;
      if (idx % 25 === 0 || idx === total - 1) {
        const pct = ((idx + 1) / total * 100).toFixed(1);
        console.log(`[${idx + 1}/${total} (${pct}%)] ${result.status}`);
      }
    } catch (err) {
      failed++;
      const count = (proxyFailCount.get(proxy) || 0) + 1;
      proxyFailCount.set(proxy, count);
      if (count >= MAX_PROXY_FAILURES) {
        badProxies.add(proxy);
        const sanitized = proxy.includes('://') ? proxy.split('://')[1].split('@').pop() : proxy.split('@').pop();
        console.log(`Retired proxy (failed ${count}x): ${sanitized}`);
      }
    }
  }
}

console.log('=== Proxy Vote Bot ===\n');

console.log('Step 1: Scraping proxies...');
const rawProxies = await scrapeProxies();

console.log('Step 2: Checking proxies...');
const workingProxies = await checkProxies(rawProxies);

if (workingProxies.length === 0) {
  console.error('No working proxies found. Exiting.');
  process.exit(1);
}

console.log(`Step 3: Voting (${VOTE_CONCURRENCY} workers, ${TOTAL} votes)...`);
const start = Date.now();
await Promise.all(Array.from({ length: VOTE_CONCURRENCY }, () => voter(workingProxies, TOTAL)));
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\nDone! ${success} success, ${failed} failed in ${elapsed}s (${(success / elapsed).toFixed(1)} req/s)`);
process.exit(0);
