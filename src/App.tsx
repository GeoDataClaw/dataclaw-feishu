import './App.css';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import AdBanner from './components/AdBanner';
import ExtractTypeSelector, { ExtractType } from './components/ExtractTypeSelector';
import HomepageExtract from './components/HomepageExtract';
import CommentsExtract from './components/CommentsExtract';
import DetailsExtract from './components/DetailsExtract';
import { ExtractFormData } from './components/ExtractTypeBase';
import { DataExtractionService, ExtractionRequest } from './services/DataExtractionService';
import { ITableMeta } from "@lark-base-open/js-sdk";

interface FormData {
  apiKey: string;
  extractType: ExtractType;
  extractData: ExtractFormData;
}

function FormSection({
  title,
  children,
  requiredMark,
  headerExtra,
  compact,
}: {
  title: string;
  children: ReactNode;
  requiredMark?: boolean;
  headerExtra?: ReactNode;
  /** 更小的内边距与标题区，用于内容很短的板块 */
  compact?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border border-gray-200 bg-gray-50 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ${compact ? 'p-3' : 'p-4'}`}
    >
      <div
        className={`flex items-center justify-between gap-3 border-b border-gray-200 ${compact ? 'mb-2 pb-2' : 'mb-4 pb-3'}`}
      >
        <div className={`flex min-w-0 items-center ${compact ? 'gap-2' : 'gap-2.5'}`}>
          <span
            className={`w-1 shrink-0 rounded-full bg-gradient-to-b from-red-600 to-red-400 ${compact ? 'h-6' : 'h-8'}`}
            aria-hidden
          />
          <h2 className={`font-semibold tracking-tight text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
            {title}
            {requiredMark ? <span className="text-red-500"> *</span> : null}
          </h2>
        </div>
        {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}
      </div>
      <div className="[&>div]:mt-0">{children}</div>
    </section>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [showApiKey, setShowApiKey] = useState(false);
  /** 有密钥且未在编辑时收起为单行展示 */
  const [apiKeyEditing, setApiKeyEditing] = useState(true);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  const [availableTables, setAvailableTables] = useState<ITableMeta[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [createNewTable, setCreateNewTable] = useState(true);
  const [extractionService, setExtractionService] = useState<DataExtractionService | null>(null);

  const [formData, setFormData] = useState<FormData>({
    apiKey: '',
    extractType: 'homepage',
    extractData: {
      url: '',
      range: 5,
      range_type: 5,
      startDate: undefined,
    },
  });

  // 初始化数据提取服务
  useEffect(() => {
    const initService = async () => {
      try {
        const service = new DataExtractionService((progress, message) => {
          setProgress(progress);
          setStatus(message);
        });

        await service.initialize();
        setExtractionService(service);

        // 获取可用表格列表
        const tables = await service.getAvailableTables();
        setAvailableTables(tables);

        // 获取当前选中的表格
        const selection = await service.getCurrentSelection();
        if (selection.tableId) {
          setSelectedTableId(selection.tableId);
          // 保持默认选择"创建新表格"，不自动切换到现有表格
          // setCreateNewTable(false);
        }
      } catch (error) {
        console.error('Failed to initialize extraction service:', error);
        setStatus('初始化服务失败，请刷新页面重试');
      }
    };

    initService();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.apiKey.trim()) {
      setStatus('请填写 API KEY');
      setApiKeyEditing(true);
      queueMicrotask(() => apiKeyInputRef.current?.focus());
      return;
    }

    if (!extractionService) {
      setStatus('服务未初始化，请刷新页面重试');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setStatus('开始数据提取...');

    try {
      // 构建提取请求
      const request: ExtractionRequest = {
        apiKey: formData.apiKey,
        extractType: formData.extractType,
        url: formData.extractData.url,
        range: formData.extractData.range,
        range_type: formData.extractData.range_type,
        startDate: formData.extractData.startDate,
        includeReplies: formData.extractData.includeReplies, // 传递 includeReplies 选项
        tableOptions: {
          tableId: createNewTable ? undefined : selectedTableId,
          createNewTable,
          tableName: createNewTable ? undefined : undefined,
        },
      };

      // 执行数据提取和表格更新
      const result = await extractionService.extractAndUpdate(request);

      if (result.success) {
        setStatus(`✅ ${result.message}`);

        // 如果创建了新表格，更新表格列表
        if (result.tableResult?.tableId) {
          const tables = await extractionService.getAvailableTables();
          setAvailableTables(tables);
          setSelectedTableId(result.tableResult.tableId);
        }
      } else {
        setStatus(`❌ ${result.message}`);
        console.error('提取失败:', result);
      }

    } catch (error) {
      console.error('提取过程出错:', error);
      setStatus(`❌ 提取过程出错: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };

  const handleExtractTypeChange = (extractType: ExtractType) => {
    // 根据不同的提取类型设置不同的初始值
    let initialData: any = {
      url: '',
      startDate: undefined,
    };

    // 只有homepage类型才有range相关字段
    if (extractType === 'homepage') {
      initialData = {
        ...initialData,
        range: 5,
        range_type: 5,
      };
    } else {
      initialData = {
        ...initialData,
        range: 1,
      };
    }

    setFormData(prev => ({
      ...prev,
      extractType,
      extractData: initialData
    }));
  };

  const handleExtractDataChange = (extractData: ExtractFormData) => {
    setFormData(prev => ({
      ...prev,
      extractData
    }));
  };

  const handleApiKeyChange = (apiKey: string) => {
    setFormData(prev => ({
      ...prev,
      apiKey
    }));
  };

  const handleApiKeyFocus = () => {
    setShowApiKey(true);
  };

  const handleApiKeyBlur = () => {
    if (formData.apiKey.length > 6) {
      setShowApiKey(false);
    }
    if (formData.apiKey.trim()) {
      setApiKeyEditing(false);
    }
  };

  const handleReplaceApiKey = () => {
    setApiKeyEditing(true);
    setShowApiKey(true);
    queueMicrotask(() => {
      apiKeyInputRef.current?.focus();
      apiKeyInputRef.current?.select();
    });
  };

  // 格式化API KEY显示
  const formatApiKeyDisplay = (apiKey: string) => {
    if (!apiKey || apiKey.length <= 6) {
      return apiKey;
    }
    const start = apiKey.substring(0, 3);
    const end = apiKey.substring(apiKey.length - 3);
    const middle = '*'.repeat(Math.max(6, apiKey.length - 6));
    return `${start}${middle}${end}`;
  };

  // 获取显示的API KEY值
  const getDisplayValue = () => {
    if (showApiKey || formData.apiKey.length <= 6) {
      return formData.apiKey;
    }
    return formatApiKeyDisplay(formData.apiKey);
  };

  const hasApiKey = formData.apiKey.trim().length > 0;
  const apiKeyCollapsed = hasApiKey && !apiKeyEditing;

  const headerLinkClass =
    'flex items-center text-xs font-semibold text-red-600 transition-colors hover:text-red-700';

  return (
    <div className="min-h-screen bg-transparent px-4 pb-28 text-gray-900">
      <div className="-mx-4 mb-6">
        {/* 广告横幅 */}
        <AdBanner extractType={formData.extractType} />
      </div>

      <div className="mx-auto w-full max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl">

        {/* 主表单卡片 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <form id="extract-form" onSubmit={handleSubmit} className="space-y-5">
            <FormSection
              title="API 密钥"
              requiredMark
              compact={apiKeyCollapsed}
              headerExtra={
                hasApiKey ? (
                  <button
                    type="button"
                    className={headerLinkClass}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleReplaceApiKey}
                  >
                    <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    更换密钥
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => window.open('https://www.geodataclaw.com/', '_blank')}
                    className={headerLinkClass}
                  >
                    <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                    </svg>
                    获取密钥
                  </button>
                )
              }
            >
              {apiKeyCollapsed ? (
                <div className="flex min-h-[2.25rem] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
                  <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-gray-900">{getDisplayValue()}</span>
                  {formData.apiKey.length > 6 ? (
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="shrink-0 text-gray-500 transition-colors hover:text-red-600"
                      title={showApiKey ? '隐藏' : '显示'}
                    >
                      {showApiKey ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="relative">
                  <input
                    ref={apiKeyInputRef}
                    type="text"
                    value={showApiKey ? formData.apiKey : getDisplayValue()}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    onFocus={handleApiKeyFocus}
                    onBlur={handleApiKeyBlur}
                    placeholder="请输入 API KEY"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-500 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    required={!apiKeyCollapsed}
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  {formData.apiKey.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 transition-colors hover:text-red-600"
                      title={showApiKey ? '隐藏 API KEY' : '显示 API KEY'}
                    >
                      {showApiKey ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              )}
            </FormSection>

            <FormSection title="数据提取类型" requiredMark>
              <ExtractTypeSelector
                value={formData.extractType}
                onChange={handleExtractTypeChange}
                showHeading={false}
              />
            </FormSection>

            <FormSection title="提取参数">
              <HomepageExtract
                formData={formData.extractData}
                onChange={handleExtractDataChange}
                isActive={formData.extractType === 'homepage'}
              />
              <CommentsExtract
                formData={formData.extractData}
                onChange={handleExtractDataChange}
                isActive={formData.extractType === 'comments'}
              />
              <DetailsExtract
                formData={formData.extractData}
                onChange={handleExtractDataChange}
                isActive={formData.extractType === 'details'}
              />
            </FormSection>

            <FormSection title="数据存储">
              <div className="space-y-3">
                <p className="text-xs text-gray-500">选择将结果写入新表或已有表格</p>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={createNewTable}
                      onChange={() => setCreateNewTable(true)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">创建新表格</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!createNewTable}
                      onChange={() => setCreateNewTable(false)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">使用现有表格</span>
                  </label>
                </div>
                {!createNewTable && (
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  >
                    <option value="">请选择表格</option>
                    {availableTables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </FormSection>

            {status ? (
              <div
                className={`rounded-xl p-4 text-sm font-medium ${
                  status.includes('❌') || status.includes('失败')
                    ? 'border border-red-500/30 bg-red-950/50 text-red-200'
                    : status.includes('✅') || status.includes('完成')
                      ? 'border border-green-200 bg-green-50 text-green-700'
                      : 'border border-red-500/20 bg-red-950/30 text-red-100'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span>{status}</span>
                  {isLoading ? <span className="text-xs">{progress}%</span> : null}
                </div>
                {isLoading ? (
                  <div className="h-2 w-full rounded-full bg-zinc-800">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-red-600 via-red-500 to-red-300 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </form>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 px-4 pt-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto w-full max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
          <button
            type="submit"
            form="extract-form"
            disabled={isLoading}
            className={`w-full rounded-xl px-6 py-4 font-semibold text-white transition-all duration-200 ${
              isLoading
                ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                : 'bg-black hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-[0_16px_40px_rgba(0,0,0,0.24)]'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="loading-spinner" />
                正在提取数据...
              </div>
            ) : (
              '开始提取数据'
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
