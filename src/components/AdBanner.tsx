import React from 'react';
import type { ExtractType } from './ExtractTypeSelector';

interface AdBannerProps {
  extractType: ExtractType;
}

const platformMap: Record<ExtractType, string[]> = {
  homepage: ['抖音', 'TikTok'],
  comments: ['抖音', '快手'],
  details: ['抖音', '小红书', '快手', 'TikTok'],
};

const AdBanner: React.FC<AdBannerProps> = ({ extractType }) => {
  const handleClick = () => {
    window.open('https://www.geodataclaw.com/', '_blank');
  };

  const platforms = platformMap[extractType];

  return (
    <div
      className="cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
      onClick={handleClick}
    >
      <div className="relative overflow-hidden border border-red-900/60 bg-gradient-to-r from-red-900 via-zinc-950 to-black p-4 text-white">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-500/15 via-transparent to-transparent"></div>
        <div className="absolute -top-2 -right-2 h-16 w-16 rounded-full bg-red-500/10 blur-lg"></div>
        <div className="absolute -bottom-1 -left-1 h-12 w-12 rounded-full bg-red-400/10 blur-md"></div>

        <div className="relative z-10">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15 backdrop-blur-sm">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <div className="text-base font-bold">获取 API KEY</div>
                <div className="text-xs opacity-80">专业数据提取服务</div>
              </div>
            </div>

            <div className="flex items-center rounded-lg bg-[rgba(180,180,180,0.4)] px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-[rgba(180,180,180,0.5)]">
              立即获取
              <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          <div className="text-sm leading-relaxed opacity-90">
            访问 <span className="font-semibold text-red-200">www.geodataclaw.com</span> 获取您的专属密钥
          </div>

          <div className="mt-3 rounded-2xl bg-white/[0.06] px-3 py-2.5 opacity-80 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                <span className="mr-2 h-2 w-2 rounded-full bg-white"></span>
                支持平台
              </div>
              <div className="text-[11px] font-medium text-white/45">
                {platforms.length} 个平台
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {platforms.map((platform) => (
                <span
                  key={platform}
                  className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white transition-colors duration-200 hover:bg-white/16"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdBanner;
