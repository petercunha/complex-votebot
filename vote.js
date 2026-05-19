import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import https from 'node:https';

// ===== CONFIG =====
const VOTE_CONCURRENCY = parseInt(process.argv[2]) || 8;
const TOTAL = parseInt(process.argv[3]) || 10000;
const MAX_PROXIES = parseInt(process.argv[4]) || 400;
const CHECK_CONCURRENCY = 400;
const CHECK_TIMEOUT = 3500;
const VOTE_TIMEOUT = 12000;
const MAX_PROXY_FAILURES = 3;
// ==================

const TARGET_URL = '/api/list-vote/f0baf645-b093-4e65-97ca-74b2ae0f08ae/slide-688edef1ec5b';
const TARGET_HOST = 'www.complex.com';

const COOKIES = 'ajs_anonymous_id=d0cdc46c-a735-436b-a35b-e8d394e5ab86; cf_clearance=sZSkBOpZYzC77XWfxGMwgr7Qt3E0KdwcHXOJdJWaXTU-1779219459-1.2.1.1-bOJ.UAGryROBQXaVtW5e1lCzTFdRLplW3Tn.aHMZ1N7Py9U5ZXJYhOYqpz5vbxj_RBi4uKfK6BTb9ZA3PFXNSRP0jpm2ZXrv2eEL4k.wpM2d3pEfUY0godP.ZvkmDZVwkTv7rDNAC2iQYjmF_fsMb4e75zTxKPK9EJcMb9ZLRYwE2gXeuesWE2cGFv0YM2IEy1ynQzQP90P7WHcEeCx25OGQQb1.8p_q3CX0HXP1FSxcsbRj0B8f3IRjKkV65kbq6g6sI3QPtkW4jq_VryfhdbnwNK9kV4QuJ0FaS7obJ9VQwxoOihydE.3Kup0br6kqczk7T6o9N_1haQFZL1AwOw; __cf_bm=.RzCqlgClPXpAvoFntotg9PB51sudB.Qju0q4Q0ymyU-1779219459.711435-1.0.1.1-YncaKhczO1C2HOM3hAZtCHwJvOE2GX8CDbItc.noh02fbTafJ5jAkINsW2i.iJXBsr8YcyIONmNpRT2ec6qQO7n2mIA89_Z1ZakeC5m.oxihjNtNP7x_CnM8do_t9FBv; cmn_daily_article_count=1; g_state={"i_l":0,"i_ll":1779219460010,"i_b":"AoFoqVgIYKOvdg8d+zS30J0R175DMm27jPJfA/KHoVY","i_e":{"enable_itp_optimization":0},"i_et":1779219460008}; analytics_session_id=1779219460165; session=e30%3D.%2B6nXsGO5TVoMb%2F8nOZwlnEP8xp%2FAL8to6buCwkPlIQo; isAuthenticated=false; _pbjs_userid_consent_data=3524755945110770; analytics_session_id.last_access=1779219462333';

const HEADERS = {
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  'content-type': 'application/json',
  'cookie': COOKIES,
  'dnt': '1',
  'origin': 'https://www.complex.com',
  'pragma': 'no-cache',
  'priority': 'u=1, i',
  'referer': 'https://www.complex.com/pop-culture/a/khal/best-internet-streamers-kick-rumble-twitch-youtube',
  'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
  'sec-ch-ua-arch': '"arm"',
  'sec-ch-ua-bitness': '"64"',
  'sec-ch-ua-full-version': '"148.0.7778.168"',
  'sec-ch-ua-full-version-list': '"Chromium";v="148.0.7778.168", "Google Chrome";v="148.0.7778.168", "Not/A)Brand";v="99.0.0.0"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-model': '""',
  'sec-ch-ua-platform': '"macOS"',
  'sec-ch-ua-platform-version': '"15.7.7"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
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
  // Tier 1: Most reliable, large lists
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt',
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
  'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
  'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks4.txt',
  'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt',

  // Tier 2: Stable APIs & good backups
  'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
  'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=10000&country=all',
  'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=all',
  'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
  'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks4.txt',
  'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks5.txt',

  // Tier 3: Specialized / curated
  'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt',
  'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt',
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
        // Extract ip:port even if line has extra metadata (e.g. ip:port:country:anon)
        const m = p.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+)/);
        if (m) {
          all.add(kind === 'http' ? m[1] : `${kind}://${m[1]}`);
        }
      }
    })
  );
  const successes = results.filter(r => r.status === 'fulfilled').length;
  const arr = [...all];
  // Fisher–Yates shuffle for unbiased randomness
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const limited = arr.slice(0, MAX_PROXIES);
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
  const race = new Promise((resolve) => {
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
      res.on('error', () => resolve({ ok: false }));
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

  // Hard guarantee: settle even if the socket timeout never fires
  const hardLimit = new Promise(r => setTimeout(() => r({ ok: false }), CHECK_TIMEOUT + 1000));
  return Promise.race([race, hardLimit]);
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

// ===== PROXY POOL (health-scored, rotating, self-healing) =====

class ProxyPool {
  constructor(proxies) {
    this.proxies = proxies.map(p => ({
      url: p,
      success: 0,
      fail: 0,
      latency: [],        // last 5 latencies (ms)
      bannedUntil: 0,
      lastUsed: 0,
    }));
    this.total = this.proxies.length;
  }

  alive() {
    const now = Date.now();
    return this.proxies.filter(p => p.bannedUntil <= now);
  }

  // Exponential-weighted score: high success rate + low latency = higher weight
  score(p) {
    const total = p.success + p.fail;
    if (total === 0) return 1.0; // new proxy, give it a chance
    const successRate = p.success / total;
    const avgLatency = p.latency.length
      ? p.latency.reduce((a, b) => a + b, 0) / p.latency.length
      : 5000;
    const latencyFactor = Math.max(0.1, 1 - avgLatency / 10000);
    return (successRate * 0.7 + latencyFactor * 0.3) + 0.05; // small bias for new
  }

  pick() {
    const candidates = this.alive();
    if (candidates.length === 0) return null;

    // Weighted random
    const weights = candidates.map(p => this.score(p));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        candidates[i].lastUsed = Date.now();
        return candidates[i];
      }
    }
    return candidates[candidates.length - 1];
  }

  recordSuccess(proxy, latencyMs) {
    proxy.success++;
    proxy.latency.push(latencyMs);
    if (proxy.latency.length > 5) proxy.latency.shift();
  }

  recordFail(proxy) {
    proxy.fail++;
    const total = proxy.success + proxy.fail;
    const failRate = proxy.fail / total;
    if (failRate > 0.7 || proxy.fail >= MAX_PROXY_FAILURES) {
      // Ban with exponential backoff (30s, 60s, 120s…), max 5 min
      const banMs = Math.min(300000, 30000 * Math.pow(2, proxy.fail - MAX_PROXY_FAILURES));
      proxy.bannedUntil = Date.now() + banMs;
      const sanitized = proxy.url.includes('://')
        ? proxy.url.split('://')[1].split('@').pop()
        : proxy.url.split('@').pop();
      console.log(`  [Pool] Proxy ${sanitized} banned ${(banMs / 1000).toFixed(0)}s (fail rate ${(failRate * 100).toFixed(0)}%)`);
    }
  }

  stats() {
    const now = Date.now();
    const alive = this.proxies.filter(p => p.bannedUntil <= now).length;
    const banned = this.proxies.length - alive;
    return { alive, banned, total: this.proxies.length };
  }

  // Re-test banned proxies in background to recycle them
  async recycleCheck(concurrency = 20) {
    const now = Date.now();
    const toCheck = this.proxies.filter(p => p.bannedUntil > 0 && p.bannedUntil <= now);
    if (toCheck.length === 0) return;

    const recycleOne = async (p) => {
      const start = Date.now();
      const result = await testProxy(p.url);
      if (result.ok) {
        p.success = 1;
        p.fail = 0;
        p.bannedUntil = 0;
        p.latency = [Date.now() - start];
      } else {
        // Ban again, longer
        p.bannedUntil = now + Math.min(300000, (p.bannedUntil - now) * 2 + 30000);
      }
    };

    const workers = Array.from({ length: concurrency }, async () => {
      while (true) {
        const p = toCheck.pop();
        if (!p) break;
        await recycleOne(p);
      }
    });
    await Promise.all(workers);
  }
}

// ===== VOTING =====

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function drawStatusLine({ elapsed, success, failed, total, alive, poolTotal, concurrency, speed, proxy }) {
  const pct = total > 0 ? ((success + failed) / total * 100).toFixed(1) : '0.0';
  const sRate = success + failed > 0 ? (success / (success + failed) * 100).toFixed(1) : '0.0';
  const status = `${CYAN}[Vote]${RESET} ${BOLD}${success + failed}${RESET}/${total} (${pct}%)  ` +
    `${GREEN}OK:${success}${RESET} ${RED}FAIL:${failed}${RESET} ${YELLOW}Rate:${sRate}%${RESET}  ` +
    `${DIM}${speed.toFixed(1)} req/s${RESET}  ` +
    `Pool:${GREEN}${alive}${RESET}/${poolTotal}  ` +
    `Workers:${concurrency}  ` +
    `Elapsed:${formatDuration(elapsed)}`;
  // Clear to end of line so old characters don't linger
  process.stdout.write('\r' + status.padEnd(100) + '\x1b[K');
}

function vote(proxyObj) {
  const race = new Promise((resolve, reject) => {
    const start = Date.now();
    const agent = getAgent(proxyObj.url);
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
      res.on('error', err => reject({ error: err.message, proxy: proxyObj }));
      res.on('end', () => {
        resolve({ status: res.statusCode, body, proxy: proxyObj, latency: Date.now() - start });
      });
    });
    req.on('error', err => reject({ error: err.message, proxy: proxyObj }));
    req.on('timeout', () => { req.destroy(); reject({ error: 'timeout', proxy: proxyObj }); });
    req.write(BODY);
    req.end();
  });

  // Hard guarantee: reject even if the socket timeout never fires
  const hardLimit = new Promise((_resolve, reject) =>
    setTimeout(() => reject({ error: 'hard-timeout', proxy: proxyObj }), VOTE_TIMEOUT + 2000)
  );
  return Promise.race([race, hardLimit]);
}

// ===== FETCH VOTE COUNT =====

function getVoteCount() {
  const race = new Promise((resolve) => {
    const req = https.get({
      hostname: TARGET_HOST,
      path: TARGET_URL,
      method: 'GET',
      headers: { ...HEADERS, 'x-anonymous-id': randomUUID() },
      timeout: 8000,
      rejectUnauthorized: false,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('error', () => resolve({ ok: false }));
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          // Expected shape: { nailed_it: 461, overrated: 583, total: 1140, underrated: 96 }
          if (data && typeof data === 'object') {
            resolve({ ok: res.statusCode === 200, status: res.statusCode, data });
          } else {
            resolve({ ok: false, status: res.statusCode, data: null, body });
          }
        } catch {
          resolve({ ok: false, status: res.statusCode, data: null, body });
        }
      });
    });
    req.on('error', () => resolve({ ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false }); });
  });

  const hardLimit = new Promise(r => setTimeout(() => r({ ok: false }), 10000));
  return Promise.race([race, hardLimit]);
}

function formatCounts(data) {
  if (!data || typeof data !== 'object') return null;
  const fields = ['nailed_it', 'overrated', 'underrated', 'total'];
  const lines = [];
  for (const key of fields) {
    if (typeof data[key] === 'number') {
      lines.push(`  ${BOLD}${key}:${RESET} ${GREEN}${data[key]}${RESET}`);
    }
  }
  return lines.join('\n');
}

async function logVoteCount(label) {
  const result = await getVoteCount();
  if (result.ok && result.data) {
    const counts = formatCounts(result.data);
    if (counts) {
      console.log(`${BOLD}${label} Vote counts for slide-688edef1ec5b${RESET}`);
      console.log(counts);
    } else {
      console.log(`${BOLD}${label} Vote count:${RESET} received unexpected data shape`);
    }
  } else {
    console.log(`${BOLD}${label} Vote count:${RESET} ${RED}failed to fetch${RESET} (status ${result.status ?? 'n/a'})`);
  }
}

// ===== MAIN =====

const taskCounterBuf = new SharedArrayBuffer(4);
const taskCounter = new Int32Array(taskCounterBuf);

async function voter(pool, total, stats) {
  while (true) {
    const idx = Atomics.add(taskCounter, 0, 1);
    if (idx >= total) break;

    const proxy = pool.pick();
    if (!proxy) {
      // No proxies available right now; wait a bit and try again
      await new Promise(r => setTimeout(r, 1000));
      if (pool.alive().length === 0) {
        // truly empty, try recycling
        await pool.recycleCheck(20);
        if (pool.alive().length === 0) break;
      }
      Atomics.sub(taskCounter, 0, 1); // put task back
      continue;
    }

    try {
      const result = await vote(proxy);
      if (result.status >= 200 && result.status < 300) {
        stats.success++;
        pool.recordSuccess(proxy, result.latency);
      } else {
        stats.failed++;
        pool.recordFail(proxy);
      }
    } catch (err) {
      stats.failed++;
      pool.recordFail(proxy);
    }
  }
}

async function runStatsLoop(pool, stats, startTime, total, intervalMs = 500) {
  const start = Date.now();
  let lastTotal = 0;
  let lastTime = start;

  return new Promise(resolve => {
    const timer = setInterval(() => {
      const now = Date.now();
      const currentTotal = stats.success + stats.failed;
      const elapsed = now - start;
      const delta = now - lastTime;
      const speed = delta > 0 ? ((currentTotal - lastTotal) / (delta / 1000)) : 0;
      const ps = pool.stats();
      drawStatusLine({
        elapsed,
        success: stats.success,
        failed: stats.failed,
        total,
        alive: ps.alive,
        poolTotal: ps.total,
        concurrency: VOTE_CONCURRENCY,
        speed,
        proxy: null,
      });
      lastTotal = currentTotal;
      lastTime = now;
      if (currentTotal >= total) {
        clearInterval(timer);
        resolve();
      }
    }, intervalMs);
  });
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

const pool = new ProxyPool(workingProxies);
await logVoteCount('Initial');
console.log(`Step 3: Voting (${VOTE_CONCURRENCY} workers, ${TOTAL} votes)...\n`);

const stats = { success: 0, failed: 0 };
const start = Date.now();

// Start background recycling every 20s
const recycleTimer = setInterval(() => pool.recycleCheck(20), 20000);

const voters = Array.from({ length: VOTE_CONCURRENCY }, () => voter(pool, TOTAL, stats));
const statsDone = runStatsLoop(pool, stats, start, TOTAL);
await Promise.all([...voters, statsDone]);

clearInterval(recycleTimer);
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
process.stdout.write('\n'); // clear line
console.log(`\nDone! ${stats.success} success, ${stats.failed} failed in ${elapsed}s (${(stats.success / elapsed).toFixed(1)} req/s)`);
await logVoteCount('Final');
