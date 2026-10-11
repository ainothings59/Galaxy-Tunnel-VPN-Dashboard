import { AlertCircle, CheckCircle2, Copy, Globe, Loader2, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { i18n } from '../i18n';
import { Server } from '../types';
import { SecurityNoticeModal } from '../components/SecurityNoticeModal';

const CARD_EDGE_BEAMS = [
  // 1. Electric Cyan & Azure (Sky)
  'conic-gradient(from 0deg, transparent 0 240deg, #06b6d4 280deg, #38bdf8 330deg, transparent 360deg)',
  // 2. Cyber Emerald & Mint
  'conic-gradient(from 0deg, transparent 0 240deg, #10b981 280deg, #34d399 330deg, transparent 360deg)',
  // 3. Neon Violet & Purple Pulse
  'conic-gradient(from 0deg, transparent 0 240deg, #8b5cf6 280deg, #c084fc 330deg, transparent 360deg)',
  // 4. Sunset Amber & Flame Orange
  'conic-gradient(from 0deg, transparent 0 240deg, #f59e0b 280deg, #fb923c 330deg, transparent 360deg)',
  // 5. Electric Rose & Hot Pink
  'conic-gradient(from 0deg, transparent 0 240deg, #f43f5e 280deg, #fb7185 330deg, transparent 360deg)',
  // 6. Royal Indigo & Deep Blue
  'conic-gradient(from 0deg, transparent 0 240deg, #3b82f6 280deg, #6366f1 330deg, transparent 360deg)',
  // 7. Aurora Spectrum (Multi-color rainbow)
  'conic-gradient(from 0deg, transparent 0 210deg, #ec4899 245deg, #8b5cf6 280deg, #06b6d4 315deg, #10b981 350deg, transparent 360deg)',
  // 8. Aquamarine & Teal Glow
  'conic-gradient(from 0deg, transparent 0 240deg, #14b8a6 280deg, #2dd4bf 330deg, transparent 360deg)',
];

const SERVERS_URLS = [
  "https://raw.githubusercontent.com/proxzero/galaxy-subdomain/main/servers.txt",
  "https://raw.githubusercontent.com/proxzero/galaxy-subdomain/refs/heads/main/servers.txt",
  "https://api.github.com/repos/proxzero/galaxy-subdomain/contents/servers.txt"
];

interface PingResult {
  ms: number | null;
  status: 'testing' | 'online' | 'offline';
}

function extractPingHost(config: string, location: string): string {
  let target = '';

  if (config.toLowerCase().startsWith('vmess://')) {
    try {
      const b64 = config.substring(8);
      const jsonStr = atob(b64.replace(/\s/g, ''));
      const obj = JSON.parse(jsonStr);
      if (obj.host) target = obj.host;
      else if (obj.add) target = obj.add;
      else if (obj.sni) target = obj.sni;
    } catch {
      // ignore
    }
  }

  if (!target) {
    const sniMatch = config.match(/sni=([^&]+)/i);
    const hostMatch = config.match(/host=([^&]+)/i);
    if (sniMatch && sniMatch[1]) {
      target = sniMatch[1];
    } else if (hostMatch && hostMatch[1]) {
      target = hostMatch[1];
    }
  }

  if (!target) {
    const atMatch = config.match(/@([^:?#/]+)/);
    if (atMatch && atMatch[1]) {
      target = atMatch[1];
    }
  }

  if (!target && location && !location.includes('Global CDN')) {
    target = location;
  }

  if (!target) {
    target = '1.1.1.1';
  }

  try {
    target = decodeURIComponent(target);
  } catch {
    // keep
  }
  return target.replace(/^\[|\]$/g, '').trim();
}

async function pingServer(server: Server): Promise<PingResult> {
  const host = extractPingHost(server.config, server.location);
  if (!host) {
    return { ms: null, status: 'offline' };
  }

  const protocol = host.startsWith('http://') || host.startsWith('https://') ? '' : 'https://';
  const url = `${protocol}${host}`;
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    // Make standard fetch request to check if worker endpoint actually responds
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    }).catch(err => {
      // If CORS blocks GET, fallback to HEAD ping
      return null;
    });

    clearTimeout(timeoutId);
    const ms = Math.round(performance.now() - start);

    // If server responded with 404 (Worker Deleted), 521/522/523 (Server Down), mark OFFLINE
    if (response) {
      if (response.status === 404 || response.status >= 520 || response.status === 502) {
        return { ms: null, status: 'offline' };
      }
      return { ms, status: 'online' };
    }

    // Secondary reachability check with strict error handling
    const secondaryController = new AbortController();
    const secTimeout = setTimeout(() => secondaryController.abort(), 2500);
    const headStart = performance.now();

    try {
      await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: secondaryController.signal
      });
      clearTimeout(secTimeout);
      const headMs = Math.round(performance.now() - headStart);
      if (headMs >= 2400) {
        return { ms: null, status: 'offline' };
      }
      return { ms: headMs, status: 'online' };
    } catch {
      clearTimeout(secTimeout);
      // Connection refused, aborted, or DNS error -> Definite OFFLINE
      return { ms: null, status: 'offline' };
    }
  } catch {
    return { ms: null, status: 'offline' };
  }
}

function parseServersFromRaw(rawText: string): Server[] {
  let text = rawText.trim();
  
  // Check if base64 encoded
  if (!text.includes('://') && text.length > 10) {
    try {
      const decoded = atob(text.replace(/\s/g, ''));
      if (decoded.includes('://')) {
        text = decoded;
      }
    } catch {
      // not base64
    }
  }

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

  const parsedServers: Server[] = [];

  lines.forEach((line, index) => {
    try {
      const sanitizedLine = line
        .replace(/allowinsecure=true/gi, 'allowInsecure=false')
        .replace(/allowinsecure=1/gi, 'allowInsecure=0')
        .replace(/allow_insecure=true/gi, 'allow_insecure=false')
        .replace(/allow_insecure=1/gi, 'allow_insecure=0');

      let name = `SERVER ${String(index + 1).padStart(2, '0')}`;
      const location = 'Cloudflare Anycast (Auto Location)';
      let description = 'High Speed Node';

      // Extract hash remark from URL if present (#Name)
      const hashIndex = sanitizedLine.lastIndexOf('#');
      if (hashIndex !== -1) {
        try {
          const rawHash = sanitizedLine.substring(hashIndex + 1);
          const decodedName = decodeURIComponent(rawHash);
          if (decodedName) {
            name = decodedName;
          }
        } catch {
          name = sanitizedLine.substring(hashIndex + 1) || name;
        }
      }

      // Determine type (VLESS, Trojan, VMess, SS, etc.)
      const lower = sanitizedLine.toLowerCase();
      if (lower.startsWith('vless://')) {
        description = 'VLESS High Speed Node';
      } else if (lower.startsWith('trojan://')) {
        description = 'Trojan Premium Node';
      } else if (lower.startsWith('vmess://')) {
        description = 'VMess High Speed Node';
      } else if (lower.startsWith('ss://')) {
        description = 'Shadowsocks Node';
      } else if (lower.startsWith('hysteria://') || lower.startsWith('hy2://')) {
        description = 'Hysteria High Speed Node';
      }

      parsedServers.push({
        id: index + 1,
        name,
        description,
        location,
        config: sanitizedLine,
        pingUrl: ''
      });
    } catch {
      // Skip bad lines
    }
  });

  return parsedServers;
}

export function Servers() {
  const { language, showToast } = useAppContext();
  const t = i18n[language];
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [pings, setPings] = useState<Record<number, PingResult>>({});
  const [showNotice, setShowNotice] = useState<boolean>(() => {
    try {
      return localStorage.getItem('galaxy_tunnel_notice_seen') !== 'true';
    } catch {
      return false;
    }
  });

  const rePingSingleServer = async (srv: Server) => {
    setPings(prev => ({
      ...prev,
      [srv.id]: { ms: null, status: 'testing' }
    }));
    const result = await pingServer(srv);
    setPings(prev => ({
      ...prev,
      [srv.id]: result
    }));
  };

  const fetchServers = async () => {
    setLoading(true);
    setError(null);
    let rawText = '';
    let success = false;

    for (const url of SERVERS_URLS) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) continue;

        if (url.includes('api.github.com')) {
          const json = await response.json();
          if (json.content) {
            const cleanedContent = json.content.replace(/\s/g, '');
            rawText = new TextDecoder().decode(
              Uint8Array.from(atob(cleanedContent), c => c.charCodeAt(0))
            );
            success = true;
            break;
          }
        } else {
          rawText = await response.text();
          success = true;
          break;
        }
      } catch {
        // Try next URL
      }
    }

    if (success) {
      const parsed = parseServersFromRaw(rawText);
      if (parsed.length === 0) {
        setError(language === 'my' ? 'ဆာဗာလင့်ခ်များ ရှာမတွေ့ပါ။' : 'No servers found in list.');
      } else {
        setServers(parsed);
        // Note: Auto pinging all servers on load is removed to respect Cloudflare Worker rate limits.
      }
    } else {
      setError(language === 'my' ? 'ဆာဗာများ ရယူ၍မရပါ။ ပြန်လည်ကြိုးစားပါ။' : 'Failed to load servers. Please try again.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleCopy = async (id: number, config: string) => {
    const srv = servers.find(s => s.id === id);
    const serverLabel = srv ? srv.name : '';

    try {
      await navigator.clipboard.writeText(config);
      setCopiedId(id);
      showToast(t.copyToastTitle, {
        subtitle: serverLabel ? `${serverLabel} — ${t.copyToastSubtitle}` : t.copyToastSubtitle,
        type: 'success',
        duration: 3000
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = config;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopiedId(id);
        showToast(t.copyToastTitle, {
          subtitle: serverLabel ? `${serverLabel} — ${t.copyToastSubtitle}` : t.copyToastSubtitle,
          type: 'success',
          duration: 3000
        });
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        console.error('Failed to copy config');
      }
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top Header & Tagline Bar */}
      <div className="text-center mb-6">
        {/* Modern Tagline & Security Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/25 text-sky-700 dark:text-sky-300 text-xs font-semibold tracking-wide shadow-xs">
            <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>{t.serversSubtitle}</span>
          </div>

          <button
            onClick={() => setShowNotice(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold transition-all shadow-xs active:scale-95 cursor-pointer"
            title={language === 'my' ? 'လုံခြုံရေးနှင့် စည်းကမ်းချက်များ ဖတ်ရှုရန်' : 'View Security & Fair Use Notice'}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{t.securityModalBtn}</span>
          </button>
        </div>

        {/* Compact Quick Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button 
            onClick={fetchServers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-700 border border-stone-200 dark:border-zinc-700 shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? (language === 'my' ? 'ရယူနေသည်...' : 'Fetching...') : (language === 'my' ? 'ပြန်လည်ရယူမည်' : 'Refresh Servers')}</span>
          </button>

          {!loading && servers.length > 0 && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-stone-100 dark:bg-zinc-800/80 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-zinc-700/80">
              {servers.length} {language === 'my' ? 'ဆာဗာ ဖွင့်လှစ်ထားရှိ' : 'Active Nodes'}
            </span>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-stone-500 dark:text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
          <p className="text-sm font-medium">{language === 'my' ? 'ဆာဗာများ ရယူနေပါသည်...' : 'Loading servers from GitHub...'}</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-6 text-center text-rose-700 dark:text-rose-400 my-4">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
          <p className="text-sm font-medium mb-4">{error}</p>
          <button
            onClick={fetchServers}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
          >
            {language === 'my' ? 'ပြန်လည်ကြိုးစားမည်' : 'Try Again'}
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {servers.map((server, idx) => {
            const beamGradient = CARD_EDGE_BEAMS[idx % CARD_EDGE_BEAMS.length];

            return (
              <div 
                key={server.id} 
                className="edge-light-card shadow-sm hover:shadow-lg dark:hover:shadow-zinc-950/70 transition-all duration-300"
              >
                {/* Moving edge lighting beam around the border */}
                <div 
                  className="edge-light-beam" 
                  style={{ background: beamGradient }}
                />

                {/* Inner Card Content */}
                <div className="edge-light-inner bg-white dark:bg-[#1a1a18] p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2.5 gap-2">
                    <h3 className="font-bold text-stone-900 dark:text-stone-100 tracking-tight">{server.name}</h3>
                    
                    {/* On-Demand Ping Button / Status Badge */}
                    {(() => {
                      const ping = pings[server.id];

                      if (!ping) {
                        return (
                          <button 
                            onClick={() => rePingSingleServer(server)}
                            className="text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 rounded-md bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-stone-300 hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400 border border-stone-200 dark:border-zinc-700 transition-all"
                          >
                            <Zap className="w-3 h-3 text-stone-400 dark:text-stone-500" />
                            <span>{t.pingSingleBtn}</span>
                          </button>
                        );
                      }

                      if (ping.status === 'testing') {
                        return (
                          <button 
                            disabled
                            className="text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 opacity-90 cursor-wait"
                          >
                            <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                            <span>{t.pingTesting}</span>
                          </button>
                        );
                      }

                      if (ping.status === 'online' && ping.ms !== null) {
                        let badgeStyle = "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400";
                        let dotStyle = "bg-emerald-500";
                        if (ping.ms > 400) {
                          badgeStyle = "bg-orange-100 text-orange-800 dark:bg-orange-500/10 dark:text-orange-400";
                          dotStyle = "bg-orange-500";
                        } else if (ping.ms > 200) {
                          badgeStyle = "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400";
                          dotStyle = "bg-amber-500";
                        }

                        return (
                          <button 
                            onClick={() => rePingSingleServer(server)}
                            title={t.pingReTest}
                            className={`text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 rounded-md ${badgeStyle} hover:opacity-80 transition-opacity`}
                          >
                            <span className={`w-2 h-2 rounded-full ${dotStyle} animate-pulse`}></span>
                            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>{ping.ms} ms</span>
                          </button>
                        );
                      }

                      return (
                        <button 
                          onClick={() => rePingSingleServer(server)}
                          title={t.pingReTest}
                          className="text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 hover:opacity-80 transition-opacity"
                        >
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>{t.offline}</span>
                        </button>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                    <Globe className="w-4 h-4 text-sky-500 shrink-0 animate-pulse" />
                    <span>{server.location}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mb-3.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{server.description}</span>
                  </div>

                  <button
                    onClick={() => handleCopy(server.id, server.config)}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
                      copiedId === server.id 
                        ? 'bg-emerald-500 text-white shadow-md scale-[1.01]' 
                        : 'bg-stone-900 text-white hover:bg-stone-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.99]'
                    }`}
                  >
                    {copiedId === server.id ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{t.serverCopyBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security, Fair Use & Liability Disclaimer Modal */}
      <SecurityNoticeModal 
        isOpen={showNotice} 
        onClose={() => setShowNotice(false)} 
      />
    </div>
  );
}
