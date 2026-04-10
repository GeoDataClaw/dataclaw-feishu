import React from 'react';

export type ExtractType = 'homepage' | 'comments' | 'details';

interface ExtractTypeSelectorProps {
  value: ExtractType;
  onChange: (value: ExtractType) => void;
  /** 为 false 时不渲染顶部「数据提取类型」标题（由外层板块标题承接） */
  showHeading?: boolean;
}

// 从各个组件的配置中获取数据 - 统一管理支持平台信息
const getExtractTypeConfigs = () => {
  return [
    {
      id: 'homepage' as ExtractType,
      title: '主页提取',
      // 与 HomepageExtract 组件的 config.supportPlatforms 保持一致
      platforms: ['抖音', 'TikTok'],
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      id: 'comments' as ExtractType,
      title: '评论提取',
      // 与 CommentsExtract 组件的 config.supportPlatforms 保持一致
      platforms: ['抖音', '快手'],
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      id: 'details' as ExtractType,
      title: '详情提取',
      // 与 DetailsExtract 组件的 config.supportPlatforms 保持一致
      platforms: ['小红书', '抖音', '快手', 'TikTok'],
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];
};

const ExtractTypeSelector: React.FC<ExtractTypeSelectorProps> = ({ value, onChange, showHeading = true }) => {
  const types = getExtractTypeConfigs();

  return (
    <div>
      {showHeading ? (
        <label className="mb-3 block text-sm font-semibold text-gray-800">
          数据提取类型 <span className="text-red-500">*</span>
        </label>
      ) : null}
      <div className="flex space-x-2">
        {types.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => onChange(type.id)}
            className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
              value === type.id
                ? 'border-red-500 bg-red-50 text-red-700 shadow-[0_10px_24px_rgba(239,68,68,0.12)]'
                : 'border-gray-200 bg-white text-gray-500 hover:border-red-200 hover:bg-red-50/40 hover:text-gray-700'
            }`}
          >
            <div className={`mb-1 ${value === type.id ? 'text-red-500' : 'text-gray-400'}`}>
              {type.icon}
            </div>
            <span className="text-xs font-medium text-center leading-tight">
              {type.title}
            </span>
          </button>
        ))}
      </div>

    </div>
  );
};

export default ExtractTypeSelector;
