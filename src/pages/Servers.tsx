import { AlertCircle, CheckCircle2, Copy, Download, Globe, Loader2, QrCode, RefreshCw, ShieldCheck, X, Zap } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
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
  const [selectedQrServer, setSelectedQrServer] = useState<Server | null>(null);
  const [qrModalCopied, setQrModalCopied] = useState<boolean>(false);

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

  const handleDownloadServerQR = (server: Server) => {
    try {
      const qrDomCanvas = document.getElementById(`server-qr-canvas-${server.id}`) as HTMLCanvasElement;
      if (!qrDomCanvas) return;

      const scale = 2; // Retina scale
      const canvas = document.createElement('canvas');
      canvas.width = 440 * scale;
      canvas.height = 240 * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(scale, scale);

      // Card Background (Dark Navy Cyber Gradient)
      const grad = ctx.createLinearGradient(0, 0, 440, 240);
      grad.addColorStop(0, '#0a1128');
      grad.addColorStop(1, '#050c1e');
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(0, 0, 440, 240, 20);
      } else {
        ctx.rect(0, 0, 440, 240);
      }
      ctx.fill();

      // Border stroke
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Glow accent
      const glow = ctx.createRadialGradient(380, 40, 0, 380, 40, 160);
      glow.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 440, 240);

      // QR Code container Box
      const qrBoxX = 22;
      const qrBoxY = 24;
      const qrBoxSize = 192;
      const qrPadding = 12;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 14);
      } else {
        ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
      }
      ctx.fill();

      // Draw QR on canvas
      ctx.drawImage(
        qrDomCanvas, 
        qrBoxX + qrPadding, 
        qrBoxY + qrPadding, 
        qrBoxSize - (qrPadding * 2), 
        qrBoxSize - (qrPadding * 2)
      );

      // Right Column Text
      const textX = 236;

      // Brand Title
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 19px "Orbitron", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('GALAXY TUNNEL', textX, 48);

      // Server Name & Protocol
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(server.name.toUpperCase(), textX, 72);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(server.description || 'Cloudflare Anycast Zero-Log', textX, 90);

      // Badge
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(textX, 110, 175, 26, 6);
      } else {
        ctx.fillRect(textX, 110, 175, 26);
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.stroke();

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText('FREE HIGH-SPEED NODE', textX + 10, 127);

      // Divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(textX, 158);
      ctx.lineTo(418, 158);
      ctx.stroke();

      // Footer Instructions
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('⚡ Scan with v2rayNG / Sing-box', textX, 180);

      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace, sans-serif';
      ctx.fillText(`DATE: ${new Date().toLocaleDateString()} • UNLIMITED`, textX, 202);

      // Export as PNG and trigger direct download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const sanitizedName = server.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      a.download = `galaxy-${sanitizedName}-qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast(t.downloadQrToast || 'QR Code ပုံ ဒေါင်းလုဒ်ရယူပြီးပါပြီ', {
        subtitle: language === 'my' ? 'ဖုန်းဓာတ်ပုံများထဲတွင် သိမ်းဆည်းပြီးပါပြီ' : 'Saved to your device gallery/downloads',
        type: 'success',
        duration: 3500
      });
    } catch (err) {
      console.error('Download QR failed', err);
      showToast(language === 'my' ? 'QR ပုံ ဒေါင်းလုဒ်မအောင်မြင်ပါ' : 'Failed to download QR image', {
        type: 'warning'
      });
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
                  <div className="flex justify-between items-start mb-3 gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-stone-900 dark:text-stone-100 tracking-tight text-base sm:text-lg truncate">
                        {server.name}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300 mt-1">
                        <Globe className="w-4 h-4 text-sky-500 shrink-0 animate-pulse" />
                        <span className="truncate">{server.location}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mt-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{server.description}</span>
                      </div>
                    </div>
                    
                    {/* Right Action Column: Ping Button at top & QR Code Button directly underneath */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {/* On-Demand Ping Button / Status Badge */}
                      {(() => {
                        const ping = pings[server.id];

                        if (!ping) {
                          return (
                            <button 
                              onClick={() => rePingSingleServer(server)}
                              className="text-xs font-semibold px-2.5 py-1.5 flex items-center gap-1.5 rounded-md bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-stone-300 hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400 border border-stone-200 dark:border-zinc-700 transition-all cursor-pointer"
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
                              className="text-xs font-semibold px-2.5 py-1.5 flex items-center gap-1.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 opacity-90 cursor-wait"
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
                              className={`text-xs font-semibold px-2.5 py-1.5 flex items-center gap-1.5 rounded-md ${badgeStyle} hover:opacity-80 transition-opacity cursor-pointer`}
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
                            className="text-xs font-semibold px-2.5 py-1.5 flex items-center gap-1.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            <span>{t.offline}</span>
                          </button>
                        );
                      })()}

                      {/* QR Code Button (placed directly in the red box area beneath Ping) */}
                      <button
                        onClick={() => setSelectedQrServer(server)}
                        className="text-xs font-semibold px-2.5 py-1.5 flex items-center gap-1.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 dark:bg-cyan-500/15 dark:hover:bg-cyan-500/25 border border-cyan-400/40 dark:border-cyan-400/30 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                        title={language === 'my' ? 'QR Code ကြည့်ရန် / Scan ဖတ်ရန်' : 'View / Scan QR Code'}
                      >
                        <QrCode className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>{t.qrBtn}</span>
                      </button>
                    </div>
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

      {/* Server QR Code Modal Popup */}
      {selectedQrServer && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedQrServer(null)}
        >
          <div 
            className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#0c1222] border border-cyan-500/30 dark:border-cyan-400/30 shadow-2xl p-5 sm:p-6 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Background cyan neon glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

            {/* Modal Header */}
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-orbitron font-bold text-base sm:text-lg text-stone-900 dark:text-white tracking-wide">
                    {selectedQrServer.name}
                  </h3>
                  <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                    {selectedQrServer.description || 'VLESS / Trojan Config'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedQrServer(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title={t.qrCloseBtn || 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code Container */}
            <div className="relative z-10 flex flex-col items-center justify-center py-2">
              <div className="bg-white p-3.5 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.15)] border border-stone-200 dark:border-cyan-500/30 flex items-center justify-center">
                <QRCodeCanvas
                  id={`server-qr-canvas-${selectedQrServer.id}`}
                  value={selectedQrServer.config}
                  size={185}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#000000"
                  className="block rounded-md"
                />
              </div>

              <div className="mt-3.5 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold">
                  <span>⚡ Scan with v2rayNG / Sing-box / Hiddify</span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1.5">
                  {selectedQrServer.location}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 mt-5 relative z-10">
              <button
                onClick={async () => {
                  await handleCopy(selectedQrServer.id, selectedQrServer.config);
                  setQrModalCopied(true);
                  setTimeout(() => setQrModalCopied(false), 2000);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  qrModalCopied
                    ? 'bg-emerald-500 text-white scale-[1.01]'
                    : 'bg-stone-900 hover:bg-stone-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white'
                }`}
              >
                {qrModalCopied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>{t.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{t.serverCopyBtn}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleDownloadServerQR(selectedQrServer)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t.qrDownloadBtn || 'QR သိမ်းမည်'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
