import React from 'react';

export interface ExtractFormData {
  [key: string]: any;
}

export interface ExtractTypeProps {
  formData: ExtractFormData;
  onChange: (data: ExtractFormData) => void;
  isActive: boolean;
}

export interface FormField {
  type: 'url' | 'number' | 'date' | 'textarea' | 'quickButtons' | 'checkbox';
  name: string;
  label: string;
  tooltip?: string;
  placeholder?: string;
  suffix?: string;
  max?: number;
  min?: number;
  required?: boolean;
  options?: Array<{ label: string; value: number | 'all' | string }>;
  rows?: number;
  customActions?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'primary';
  }>;
  showWhen?: (formData: ExtractFormData) => boolean;
  targetField?: string; // quickButtons类型用于指定要设置的目标字段
  defaultValue?: any; // checkbox类型的默认值
  /** 与右侧并排展示的复选框字段 name（仅用于 number 与 checkbox 同一行，如评论页数+包含回复） */
  inlineCheckboxAfter?: string;
}

export interface ExtractTypeConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  supportPlatforms: string[];
  formList: FormField[];
}

const ExtractTypeBase: React.FC<ExtractTypeProps & { config: ExtractTypeConfig }> = ({
  formData,
  onChange,
  isActive,
  config
}) => {
  const handleFieldChange = (fieldName: string, value: any) => {
    onChange({ ...formData, [fieldName]: value });
  };

  // 获取今天的日期字符串 (YYYY-MM-DD)
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // 获取快捷日期选择
  const getQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  if (!isActive) return null;

  const renderCheckboxControl = (field: FormField) => {
    const fieldValue = formData[field.name];
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <input
          type="checkbox"
          id={field.name}
          checked={fieldValue !== undefined ? fieldValue : field.defaultValue || false}
          onChange={(e) => handleFieldChange(field.name, e.target.checked)}
          className="h-4 w-4 shrink-0 rounded border-gray-300 bg-white text-red-500 transition-colors focus:ring-red-500"
        />
        <div className="flex min-w-0 items-center">
          <label htmlFor={field.name} className="cursor-pointer text-sm font-medium text-gray-700">
            {field.label}
          </label>
          {field.tooltip && (
            <div className="relative ml-1.5 group">
              <svg className="h-4 w-4 cursor-help text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {field.tooltip}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderField = (field: FormField) => {
    const fieldValue = formData[field.name];

    switch (field.type) {
      case 'url':
        return (
          <div key={`${field.name}-url`}>
            <div className="flex items-center mb-2">
              <label className="text-sm font-semibold text-gray-800">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.tooltip && (
                <div className="relative ml-1 group">
                  <svg
                    className="h-4 w-4 cursor-help text-gray-400 transition-colors hover:text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-black px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                    {field.tooltip}
                    <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <input
                type="url"
                value={fieldValue || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pl-11 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                required={field.required}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {config.icon}
              </div>
            </div>
          </div>
        );

      case 'quickButtons':
        return (
          <div key={`${field.name}-quickButtons`}>
            {field.label && (
              <div className="flex items-center mb-2">
                <label className="text-sm font-semibold text-gray-800">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.tooltip && (
                  <div className="ml-2 group relative">
                    <svg className="h-4 w-4 cursor-help text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {field.tooltip}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 mb-3">
              {field.options?.map((option) => {
                // 判断是否选中
                const isSelected = fieldValue === option.value;

                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      // 同时设置range_type和range的值
                      let updates: any = {
                        [field.name]: option.value
                      };

                      // 如果有targetField，同时设置目标字段的值
                      if (field.targetField) {
                        let targetValue;
                        if (option.value === 'all') {
                          targetValue = 'all';
                        } else if (option.value === 'custom') {
                          // 自定义时不设置range值，等用户输入
                          targetValue = undefined;
                        } else {
                          targetValue = option.value;
                        }
                        updates[field.targetField] = targetValue;
                      }

                      // 一次性更新所有字段
                      onChange({ ...formData, ...updates });
                    }}
                    className={`flex-1 px-3 py-2 text-xs font-medium border rounded-lg transition-colors ${
                      isSelected
                        ? 'border-red-200 bg-red-100 text-red-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'number': {
        const isCustomMode = field.showWhen && field.showWhen(formData);
        const isRequired = field.required || (isCustomMode && formData.range_type === 'custom');
        const pairedCheckbox = field.inlineCheckboxAfter
          ? config.formList.find((f) => f.name === field.inlineCheckboxAfter && f.type === 'checkbox')
          : undefined;

        return (
          <div key={`${field.name}-number`}>
            {field.label && (
              <div className="mb-2 flex items-center">
                <label className="text-sm font-semibold text-gray-800">
                  {field.label} {isRequired && <span className="text-red-500">*</span>}
                </label>
                {field.tooltip && (
                  <div className="relative ml-1 group">
                    <svg
                      className="h-4 w-4 cursor-help text-gray-400 transition-colors hover:text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-black px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                      {field.tooltip}
                      <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className={pairedCheckbox ? 'flex items-center gap-5' : ''}>
              <div className={`relative ${pairedCheckbox ? 'w-36 shrink-0 sm:w-44' : ''}`}>
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={fieldValue || ''}
                  onChange={(e) => handleFieldChange(field.name, parseInt(e.target.value) || field.min || 1)}
                  className={`rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-500/20 ${
                    pairedCheckbox ? 'w-full pr-9 text-sm' : 'w-full px-4 py-3 pr-12'
                  }`}
                  required={isRequired}
                  placeholder={isCustomMode ? '请输入自定义页数' : field.placeholder}
                />
                {field.suffix && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
                    <span className="text-xs text-gray-500 sm:text-sm">{field.suffix}</span>
                  </div>
                )}
              </div>
              {pairedCheckbox ? <div className="min-w-0">{renderCheckboxControl(pairedCheckbox)}</div> : null}
            </div>
            {field.min && field.max && (
              <p className="mt-1 text-xs text-gray-500">
                建议范围：{field.min}-{field.max}
                {field.suffix}
              </p>
            )}
          </div>
        );
      }

      case 'date':
        return (
          <div key={`${field.name}-date`}>
            <label className="mb-2 block text-sm font-semibold text-gray-800">
              {field.label} {field.required && <span className="text-red-500">*</span>}
              {!field.required && <span className="text-xs font-normal text-gray-500">(可选)</span>}
            </label>

            {/* 快捷日期选择 */}
            {field.options && (
              <div className="mb-3 flex gap-2">
                {field.options.map((option) => {
                  const quickValue = getQuickDate(Number(option.value));
                  const isSelected = fieldValue === quickValue;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleFieldChange(field.name, quickValue)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        isSelected
                          ? 'border-red-200 bg-red-100 text-red-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 自定义日期 */}
            <div>
              <label className="mb-1 block text-xs text-gray-500">自定义开始日期</label>
              <div className="relative group">
                <input
                  type="date"
                  value={fieldValue || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  max={getTodayString()}
                  className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 transition-all duration-200 hover:bg-gray-50 focus:border-red-500 focus:bg-white focus:ring-red-500/20 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                  style={{ colorScheme: 'light' }}
                  required={field.required}
                />
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400 transition-colors duration-200 group-hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                {fieldValue && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFieldChange(field.name, undefined);
                    }}
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 transform text-gray-400 transition-colors duration-200 hover:text-red-500"
                    title="清除日期"
                  >
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 hover:bg-red-100">
                      <span className="text-xs">×</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              可选择时间范围进一步筛选数据，不选择则按页数获取最新数据
            </p>
          </div>
        );

      case 'textarea':
        return (
          <div key={`${field.name}-textarea`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <label className="text-sm font-semibold text-gray-800">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.tooltip && (
                  <div className="relative ml-1 group">
                    <svg
                      className="h-4 w-4 cursor-help text-gray-400 transition-colors hover:text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-black px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                      {field.tooltip}
                      <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                    </div>
                  </div>
                )}
              </div>
              {field.customActions && (
                <div className="flex items-center space-x-3">
                  {field.customActions.map((action, index) => {
                    const isPrimary = action.variant === 'primary';
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={action.onClick}
                        className={`text-xs font-medium flex items-center transition-colors ${
                          isPrimary
                            ? 'rounded-md px-2 py-1 text-red-600 hover:bg-red-50 hover:text-red-700'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        {action.icon}
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <textarea
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              rows={field.rows || 6}
              required={field.required}
            />

            {field.name === 'url' && fieldValue && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500">
                  支持多个链接，一行一个。已输入 <span className="font-medium text-red-300">{fieldValue.split('\n').filter((line: string) => line.trim()).length}</span> 个链接
                </p>
                <p className="text-xs text-gray-500">
                  支持导入 .txt, .csv, .xlsx, .xls 文件
                </p>
              </div>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={`${field.name}-checkbox`}>
            {renderCheckboxControl(field)}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {false && <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-red-500">
            {config.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900">
              {config.title}
            </div>
            {config.supportPlatforms.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-gray-600">支持平台</p>
                <div className="flex flex-wrap gap-1.5">
                  {config.supportPlatforms.map((platform) => (
                    <span
                      key={platform}
                      className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>}

      {config.formList.map((field) => {
        if (field.type === 'quickButtons') {
          return null;
        }

        if (field.type === 'checkbox') {
          const inlinedInNumber = config.formList.some(
            (f) => f.type === 'number' && f.inlineCheckboxAfter === field.name
          );
          if (inlinedInNumber) {
            return null;
          }
        }

        const quickButtonField = config.formList.find(f =>
          f.type === 'quickButtons' && f.targetField === field.name
        );

        const shouldShow = !field.showWhen || field.showWhen(formData);

        if (!shouldShow) {
          return quickButtonField ? (
            <div key={`${field.name}-quickButtons-only`}>
              {renderField(quickButtonField)}
            </div>
          ) : null;
        }

        return (
          <div key={`${field.name}-field-group`}>
            {quickButtonField && renderField(quickButtonField)}
            {renderField(field)}
          </div>
        );
      })}
    </div>
  );
};

export default ExtractTypeBase;
