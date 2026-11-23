import { Download, ShieldCheck, FileCheck2, CheckCircle2, Smartphone, KeyRound, Share2, ExternalLink, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { i18n } from '../i18n';

const GALAXY_DIRECT_APK_URL =
  'https://www.mediafire.com/file/um1kjyec4k6ige9/Galaxy_Tunnel_V1.1.0.apk/file?dkey=r8bdrkoexbv&r=1508';
const GALAXY_MIRROR_URL =
  'https://www.mediafire.com/file/um1kjyec4k6ige9/Galaxy_Tunnel_V1.1.0.apk/file';

export function Apps() {
  const { language, showToast } = useAppContext();
  const t = i18n[language];
  const [linkCopied, setLinkCopied] = useState(false);

  const handleShareLink = async () => {
    const shareUrl = `${window.location.origin}/download/galaxytunnel_apk`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setLinkCopied(true);
    showToast(t.appLinkCopiedToast, {
      subtitle: shareUrl,
      type: 'success',
      duration: 3000,
    });
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const apps = [
    { 
      name: 'Hiddify Next', 
      tag: 'ALL PLATFORMS', 
      desc: t.app1Desc,
      url: 'https://play.google.com/store/apps/details?id=app.hiddify.com',
      size: 'Play Store',
      isGooglePlay: true
    },
    { 
      name: 'v2rayNG (Universal Update)', 
      tag: 'ANDROID', 
      desc: t.app2Desc,
      url: 'https://www.mediafire.com/file/rjxo488bipw1b8p/v2ayNG_Android_All_New_version2.2.apk/file?dkey=2v5e5w857p5&r=34',
      size: 'File Size: ~38 MB',
      isGooglePlay: false
    },
    { 
      name: 'v2RayTun (All Versions)', 
      tag: 'iOS & ANDROID', 
      desc: t.app3Desc,
      url: 'https://www.mediafire.com/file/wk0kiiyv3tg4ai8/v2RayTun_Android_All_Versions.apk/file?dkey=0vfrpal11gv&r=1183',
      size: 'File Size: ~32 MB',
      isGooglePlay: false
    },
    {
      name: 'Cloudflare One Agent', 
      tag: 'ALL PLATFORMS', 
      desc: t.app5Desc,
      url: 'https://play.google.com/store/apps/details?id=com.cloudflare.onedotonedotonedotone',
      size: 'Play Store',
      isGooglePlay: true
    }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">{t.appsTitle}</h1>
        <p className="text-sm font-medium text-stone-600 dark:text-stone-400 tracking-wide">{t.appsSubtitle}</p>
      </div>

      <div className="space-y-5">
        {/* Featured Official Galaxy Tunnel Android App Card */}
        <div
          id="galaxytunnel-apk"
          className="edge-light-card shadow-md hover:shadow-xl transition-all duration-300"
        >
          <div
            className="edge-light-beam"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0 210deg, #06b6d4 250deg, #38bdf8 295deg, #6366f1 335deg, transparent 360deg)',
            }}
          />

          <div className="edge-light-inner bg-white dark:bg-[#10141f] p-5 sm:p-6">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3.5">
                <img
                  src="/icon-192.png"
                  alt="Galaxy Tunnel App Icon"
                  className="w-14 h-14 rounded-2xl shadow-md border border-cyan-500/30 shrink-0 object-cover"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-orbitron text-lg sm:text-xl font-extrabold text-stone-900 dark:text-white tracking-wide">
                      Galaxy Tunnel
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold">
                      v1.1.0
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-cyan-400">
                    <Sparkles className="w-3 h-3" />
                    <span>{t.officialAppBadge}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleShareLink}
                type="button"
                title={t.copyAppLinkBtn}
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-stone-300 text-xs font-semibold border border-stone-200 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-sky-500" />
                <span>{linkCopied ? t.copied : t.copyAppLinkBtn}</span>
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-stone-600 dark:text-stone-300 mb-4 leading-relaxed font-medium">
              {t.officialAppDesc}
            </p>

            {/* Essential APK Specifications (from APK Info) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/70 dark:border-white/10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  File Size
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-100 mt-0.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span>69.57 MB</span>
                </div>
              </div>

              <div className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/70 dark:border-white/10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Android OS
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-100 mt-0.5">
                  <Smartphone className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>5.0+ (API 21–34)</span>
                </div>
              </div>

              <div className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/70 dark:border-white/10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Signature
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-100 mt-0.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>V1 + V2 + V3</span>
                </div>
              </div>

              <div className="px-3 py-2 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200/70 dark:border-white/10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Security
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>100% Clean</span>
                </div>
              </div>
            </div>

            {/* Package ID Subtle Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 mb-5 rounded-lg bg-stone-100/80 dark:bg-black/30 border border-stone-200/60 dark:border-white/5 text-[11px] text-stone-500 dark:text-stone-400 font-mono">
              <span>Package: <strong className="text-stone-700 dark:text-stone-200">com.galaxytunnel.vpn</strong></span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                Verified APK
              </span>
            </div>

            {/* Primary APK Download Button */}
            <a
              href={GALAXY_DIRECT_APK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full relative overflow-hidden group flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-500 hover:via-sky-500 hover:to-blue-500 transition-all shadow-[0_4px_20px_rgba(14,165,233,0.35)] hover:shadow-[0_6px_25px_rgba(14,165,233,0.5)] active:scale-[0.99]"
            >
              <Download className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:scale-110" />
              <span>{t.officialDownloadBtn}</span>
            </a>

            {/* Mirror Page Fallback Link */}
            <div className="mt-3 text-center">
              <a
                href={GALAXY_MIRROR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-sky-600 dark:text-stone-400 dark:hover:text-cyan-400 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>{t.mirrorPageLabel}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Community / Third-Party VPN Clients */}
        {apps.map((app) => (
          <div key={app.name} className="bg-white dark:bg-[#121212] border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{app.name}</h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest">{app.tag}</div>
            </div>
            
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-4 font-medium">{app.desc}</p>
            
            <div className="flex flex-wrap items-center gap-3 mb-5 px-3 py-2 bg-stone-50 dark:bg-[#1a1a1a] rounded-lg">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
                <FileCheck2 className="w-3.5 h-3.5 text-blue-500" />
                {app.size}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                No Errors
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                100% Virus Free
              </div>
            </div>

            <a 
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full relative overflow-hidden group flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-stone-900 hover:bg-stone-800 dark:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,10%)] dark:shadow-[0_4px_14px_0_rgb(37,99,235,39%)] hover:shadow-[0_6px_20px_rgba(0,0,0,23%)] dark:hover:shadow-[0_6px_20px_rgba(37,99,235,23%)]"
            >
              <Download className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:scale-110" />
              <span>{app.isGooglePlay ? 'Get it on Google Play' : t.downloadBtn}</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
