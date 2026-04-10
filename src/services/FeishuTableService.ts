import {
  bitable,
  ITableMeta,
  IFieldMeta,
  FieldType,
  DateFormatter,
} from "@lark-base-open/js-sdk";

export interface TableUpdateOptions {
  tableId?: string;
  createNewTable?: boolean;
  tableName?: string;
  extractType: string;
  onProgress?: (progress: number, message: string) => void;
}

export interface TableUpdateResult {
  success: boolean;
  message: string;
  recordCount?: number;
  tableId?: string;
  tableName?: string;
}

export class FeishuTableService {
  private tableMetaList: ITableMeta[] = [];
  private static readonly FIELD_TYPE_META_KEY = "__fieldTypes";

  async initialize(): Promise<void> {
    try {
      this.tableMetaList = await bitable.base.getTableMetaList();
    } catch (error) {
      console.error("Failed to initialize Feishu table service:", error);
      throw new Error("无法初始化飞书多维表格服务");
    }
  }

  async getTableList(): Promise<ITableMeta[]> {
    if (this.tableMetaList.length === 0) {
      await this.initialize();
    }
    return this.tableMetaList;
  }

  async getCurrentSelection(): Promise<{ tableId?: string }> {
    try {
      const selection = await bitable.base.getSelection();
      return { tableId: selection.tableId! };
    } catch (error) {
      console.error("Failed to get current selection:", error);
      return {};
    }
  }

  async updateTable(
    data: any[],
    options: TableUpdateOptions,
    extractor?: any
  ): Promise<TableUpdateResult> {
    try {
      console.log("开始更新表格，数据条数:", data.length);
      if (data.length > 0) {
        console.log("第一条数据的字段:", Object.keys(data[0]));
      }

      // 进度回调辅助函数
      const reportProgress = (progress: number, message: string) => {
        if (options.onProgress) {
          options.onProgress(progress, message);
        }
      };

      reportProgress(0, "开始表格更新...");

      let tableId = options.tableId;
      let tableName = options.tableName;

      // 如果需要创建新表格
      if (options.createNewTable || !tableId) {
        console.log("创建新表格...");
        reportProgress(10, "正在创建新表格...");
        const createResult = await this.createTable(options.extractType, data, extractor);
        tableId = createResult.tableId;
        tableName = createResult.tableName;
        console.log("新表格创建成功，ID:", tableId);
        reportProgress(30, "新表格创建完成");
      }

      if (!tableId) {
        throw new Error("无法确定目标表格");
      }

      // 获取表格实例
      console.log("获取表格实例，ID:", tableId);
      reportProgress(35, "正在获取表格实例...");
      const table = await bitable.base.getTableById(tableId);

      // 确保字段存在
      console.log("确保字段存在...");
      reportProgress(40, "正在检查和添加字段...");
      await this.ensureFields(table, data);

      // 再次检查表格字段
      console.log("检查表格字段...");
      const finalFields = await table.getFieldMetaList();
      const finalFieldNames = finalFields.map((f: any) => f.name);

      // 检查数据字段和表格字段的匹配情况
      const sampleDataFields = Object.keys(data[0])
        .filter((field) => field !== FeishuTableService.FIELD_TYPE_META_KEY)
        .map((field) => this.sanitizeFieldName(field));

      const missingInTable = sampleDataFields.filter(
        (field) => !finalFieldNames.includes(field)
      );
      const extraInTable = finalFieldNames.filter(
        (field) => !sampleDataFields.includes(field)
      );

      if (missingInTable.length > 0) {
        console.error("表格中缺失的字段:", missingInTable);
      }
      if (extraInTable.length > 0) {
        console.log("表格中多余的字段:", extraInTable);
      }

      // 获取最新的字段信息用于记录添加
      const tableFields = await table.getFieldMetaList();

      // 批量添加记录
      console.log("开始添加记录...");
      reportProgress(60, "正在添加记录到表格...");
      const recordCount = await this.addRecords(
        table,
        data,
        tableFields,
        (progress: number, message: string) => {
          // 将记录添加的进度映射到60-90%的范围
          const mappedProgress = 60 + progress * 0.3;
          reportProgress(mappedProgress, message);
        }
      );

      reportProgress(100, "表格更新完成！");

      return {
        success: true,
        message: `成功添加 ${recordCount} 条记录到表格`,
        recordCount,
        tableId,
        tableName,
      };
    } catch (error) {
      console.error("Failed to update table:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "更新表格失败",
      };
    }
  }

  private async createTable(
    extractType: string,
    sampleData: any[],
    extractor?: any
  ): Promise<{ tableId: string; tableName: string }> {
    const tableName = this.generateTableName(extractor, sampleData);

    try {
      const table = await bitable.base.addTable({
        name: tableName,
        fields: this.generateFieldsConfig(extractType, sampleData),
      });

      // 更新表格列表
      await this.initialize();

      return {
        tableId: table.tableId,
        tableName,
      };
    } catch (error) {
      console.error("Failed to create table:", error);
      throw new Error(
        `创建表格失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  private generateTableName(extractor: any, data?: any[]): string {
    // 从extractor的getTypeDisplayName方法获取类型显示名称
    let typeName = "数据提取"; // 默认名称

    try {
      if (extractor && typeof extractor.getTypeDisplayName === 'function') {
        typeName = extractor.getTypeDisplayName(data);
        console.log(`从extractor获取表格类型名称: ${typeName}`);
      } else {
        console.warn('extractor没有getTypeDisplayName方法，使用默认名称');
      }

    } catch (error) {
      console.error('获取extractor类型名称失败:', error);
    }

    const timestamp = new Date()
      .toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      .replace(/[\/\s:]/g, "");

    return `${typeName}_${timestamp}`;
  }

  private generateFieldsConfig(extractType: string, sampleData: any[]): any[] {
    // 完全基于样本数据动态生成字段配置
    if (sampleData.length === 0) {
      // 如果没有样本数据，返回一个基础字段
      return [{ name: "提取时间", type: FieldType.DateTime }];
    }

    const sample = sampleData[0];
    const fields = Object.keys(sample)
      .filter((key) => key !== FeishuTableService.FIELD_TYPE_META_KEY)
      .map((key) => {
      const fieldName = this.sanitizeFieldName(key);
      const fieldType =
        this.getDeclaredFieldType(sample, key, sample[key]) ??
        this.inferFieldType(this.unwrapTypedFieldValue(sample[key]), key);

      const fieldConfig: any = {
        name: fieldName,
        type: fieldType,
      };

      // 如果是DateTime字段，添加格式配置
      if (fieldType === FieldType.DateTime) {
        fieldConfig.property = {
          dateFormat: DateFormatter.DATE_TIME, // "yyyy/MM/dd HH:mm"
          displayTimeZone: false,
          autoFill: false
        };
        // console.log(`🕒 表格创建时配置DateTime字段: ${fieldName}`);
      }

      // 如果是CreatedTime字段，添加格式配置
      if (fieldType === FieldType.CreatedTime) {
        fieldConfig.property = {
          dateFormat: DateFormatter.DATE_TIME, // "yyyy/MM/dd HH:mm"
          displayTimeZone: false
        };
        // console.log(`🕒 表格创建时配置CreatedTime字段: ${fieldName}`);
      }

      return fieldConfig;
    });

    // console.log(
    //   `动态生成字段配置 (${extractType}):`,
    //   fields.map((f) => `${f.name}: ${f.type}`)
    // );

    return fields;
  }

  private sanitizeFieldName(fieldName: string): string {
    // 清理字段名称，移除可能导致问题的特殊字符
    let sanitized = fieldName.trim();

    // 只保留中文、英文、数字和下划线
    sanitized = sanitized.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_]/g, "");

    // 确保字段名不为空
    if (sanitized === "") {
      sanitized = "field";
    }

    // 确保字段名不以数字开头
    if (/^\d/.test(sanitized)) {
      sanitized = "field_" + sanitized;
    }

    // console.log(`字段名清理: "${fieldName}" -> "${sanitized}"`);

    return sanitized;
  }

  private inferFieldType(value: any, fieldName?: string): FieldType {
    // 特殊处理：如果字段名是"提取时间"，使用CreatedTime类型
    if (fieldName === '提取时间') {
      // console.log(`字段 "${fieldName}" 被识别为CreatedTime类型`);
      return FieldType.CreatedTime;
    }

    if (typeof value === "number") {
      return FieldType.Number;
    }

    if (typeof value === "boolean") {
      return FieldType.Checkbox;
    }

    if (typeof value === "string") {
      const trimmedValue = value.trim();

      // 检查是否是URL
      if (
        trimmedValue.startsWith("http://") ||
        trimmedValue.startsWith("https://")
      ) {
        return FieldType.Url;
      }

      // 检查是否是日期时间格式
      if (this.isDateTimeString(trimmedValue)) {
        console.log(`字段值 "${trimmedValue}" 被识别为DateTime类型`);
        return FieldType.DateTime;
      }

      // 检查是否是数字字符串
      if (this.isNumericString(trimmedValue)) {
        return FieldType.Number;
      }
    }

    return FieldType.Text;
  }

  private isDateTimeString(value: string): boolean {
    // 检查中文日期格式：2024年1月1日 12:00:00
    if (value.includes("年") && value.includes("月") && value.includes("日")) {
      return true;
    }

    // 检查标准日期格式：2024-01-01 12:00:00 或 2024/01/01 12:00:00
    const dateTimePattern =
      /^\d{4}[-/]\d{1,2}[-/]\d{1,2}(\s+\d{1,2}:\d{1,2}(:\d{1,2})?)?$/;
    if (dateTimePattern.test(value)) {
      return true;
    }

    // 检查中文本地化日期格式：2025/1/25 18:47:05 或 2025/1/25 下午6:47:05
    const chineseLocaleDatePattern = /^\d{4}\/\d{1,2}\/\d{1,2}\s+(上午|下午)?\d{1,2}:\d{1,2}(:\d{1,2})?$/;
    if (chineseLocaleDatePattern.test(value)) {
      return true;
    }

    // 检查时间格式：12:00:00 或 12:00
    const timePattern = /^\d{1,2}:\d{1,2}(:\d{1,2})?$/;
    if (timePattern.test(value)) {
      return false;
    }

    // 尝试用 Date 构造函数解析，如果能成功解析且不是 Invalid Date，则认为是日期
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        // 额外检查：确保不是纯数字字符串被误识别为日期
        if (!/^\d+$/.test(value)) {
          console.log(`通用Date解析识别时间格式: "${value}"`);
          return true;
        }
      }
    } catch (e) {
      // 解析失败，继续其他检查
    }

    return false;
  }

  private isNumericString(value: string): boolean {
    // 检查是否是纯数字字符串（可能包含小数点和负号）
    const numericPattern = /^-?\d+(\.\d+)?$/;
    return numericPattern.test(value) && !isNaN(Number(value));
  }

  private async ensureFields(table: any, data: any[]): Promise<void> {
    if (data.length === 0) return;

    try {
      const existingFields = await table.getFieldMetaList();
      const existingFieldNames = existingFields.map(
        (field: IFieldMeta) => field.name
      );

      const sampleRecord = data[0];
      const requiredFields = Object.keys(sampleRecord).filter(
        (field) => field !== FeishuTableService.FIELD_TYPE_META_KEY
      );

      // 创建字段映射：原始字段名 -> 清理后的字段名
      const fieldMapping = new Map<string, string>();
      requiredFields.forEach((field) => {
        fieldMapping.set(field, this.sanitizeFieldName(field));
      });

      // 检查缺失字段
      const sanitizedRequiredFields = Array.from(fieldMapping.values());
      const missingFields = sanitizedRequiredFields.filter(
        (field) => !existingFieldNames.includes(field)
      );

      const fieldsToFix = existingFields
        .map((field: IFieldMeta) => {
          let originalFieldName = "";
          for (const [original, sanitized] of fieldMapping.entries()) {
            if (sanitized === field.name) {
              originalFieldName = original;
              break;
            }
          }

          if (!originalFieldName) {
            return null;
          }

          const rawValue = sampleRecord[originalFieldName];
          const expectedFieldType =
            this.getDeclaredFieldType(sampleRecord, originalFieldName, rawValue) ??
            this.inferFieldType(this.unwrapTypedFieldValue(rawValue), originalFieldName);

          if (field.type !== expectedFieldType) {
            return {
              field,
              expectedFieldType,
            };
          }

          return null;
        })
        .filter(Boolean) as Array<{
          field: IFieldMeta;
          expectedFieldType: FieldType;
        }>;


      if (missingFields.length > 0) {

        // 找到缺失字段对应的原始字段名
        for (const sanitizedFieldName of missingFields) {
          // 找到对应的原始字段名
          let originalFieldName = "";
          for (const [original, sanitized] of fieldMapping.entries()) {
            if (sanitized === sanitizedFieldName) {
              originalFieldName = original;
              break;
            }
          }

          if (!originalFieldName) {
            console.error(`无法找到字段 ${sanitizedFieldName} 的原始名称`);
            continue;
          }

          try {
            const sampleValue = sampleRecord[originalFieldName];
            const rawValue = this.unwrapTypedFieldValue(sampleValue);
            const fieldType =
              this.getDeclaredFieldType(sampleRecord, originalFieldName, sampleValue) ??
              this.inferFieldType(rawValue, originalFieldName);
            console.log(
              `准备添加字段: ${sanitizedFieldName} (原名: ${originalFieldName}, 样本值: "${sampleValue}", 推断类型: ${fieldType}, DateTime类型值: ${FieldType.DateTime}, CreatedTime类型值: ${FieldType.CreatedTime})`
            );

            const fieldConfig: any = {
              name: sanitizedFieldName,
              type: fieldType,
            };

            // 如果是DateTime字段，添加格式配置
            if (fieldType === FieldType.DateTime) {
                console.log(`🕒 检测到DateTime字段，开始配置: ${sanitizedFieldName}`);
                fieldConfig.property = {
                  dateFormat: DateFormatter.DATE_TIME, // "yyyy/MM/dd HH:mm"
                  displayTimeZone: false,
                  autoFill: false
                };
                console.log(`✅ DateTime字段 "${sanitizedFieldName}" 配置完成，使用格式: ${DateFormatter.DATE_TIME}`);
            } else if (fieldType === FieldType.CreatedTime) {
                console.log(`🕒 检测到CreatedTime字段，开始配置: ${sanitizedFieldName}`);
                fieldConfig.property = {
                  dateFormat: DateFormatter.DATE_TIME, // "yyyy/MM/dd HH:mm"
                  displayTimeZone: false
                };
                console.log(`✅ CreatedTime字段 "${sanitizedFieldName}" 配置完成，使用格式: ${DateFormatter.DATE_TIME}`);
            } else {
                console.log(`⚪ 字段 "${sanitizedFieldName}" 不是时间类型，类型为: ${fieldType}`);
            }

            console.log(`开始创建字段: ${sanitizedFieldName}，配置:`, fieldConfig);
            await table.addField(fieldConfig);

            console.log(`✅ 成功添加字段: ${sanitizedFieldName}`);
          } catch (fieldError) {
            console.error(`❌ 添加字段 ${sanitizedFieldName} 失败:`, fieldError);
            // 继续添加其他字段
          }
        }
      } else {
        console.log("所有字段都已存在");
      }

      if (fieldsToFix.length > 0) {
        for (const fieldToFix of fieldsToFix) {
          try {
            const fieldConfig: any = {
              name: fieldToFix.field.name,
              type: fieldToFix.expectedFieldType,
            };

            if (fieldToFix.expectedFieldType === FieldType.DateTime) {
              fieldConfig.property = {
                dateFormat: DateFormatter.DATE_TIME,
                displayTimeZone: false,
                autoFill: false,
              };
            } else if (fieldToFix.expectedFieldType === FieldType.CreatedTime) {
              fieldConfig.property = {
                dateFormat: DateFormatter.DATE_TIME,
                displayTimeZone: false,
              };
            }

            console.log(
              `检测到字段类型不一致，尝试修正: ${fieldToFix.field.name}, 当前类型: ${fieldToFix.field.type}, 目标类型: ${fieldToFix.expectedFieldType}`
            );
            await table.setField(fieldToFix.field.id, fieldConfig);
          } catch (fieldFixError) {
            console.warn(`自动修正字段 ${fieldToFix.field.name} 类型失败:`, fieldFixError);
          }
        }
      }
    } catch (error) {
      console.warn("Failed to ensure fields:", error);
      // 继续执行，不阻断流程
    }
  }

  private isTypedFieldValue(value: unknown): value is { value: unknown; type: unknown } {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      "value" in value &&
      "type" in value
    );
  }

  private unwrapTypedFieldValue<T = any>(value: T): any {
    if (this.isTypedFieldValue(value)) {
      return value.value;
    }

    return value;
  }

  private normalizeDeclaredFieldType(fieldType: unknown): FieldType | undefined {
    if (typeof fieldType === "number") {
      return fieldType as FieldType;
    }

    if (fieldType === String) {
      return FieldType.Text;
    }

    if (fieldType === Number) {
      return FieldType.Number;
    }

    if (fieldType === Boolean) {
      return FieldType.Checkbox;
    }

    if (fieldType === Date) {
      return FieldType.DateTime;
    }

    if (typeof fieldType !== "string") {
      return undefined;
    }

    const normalized = fieldType.trim().toLowerCase().replace(/[_\s-]/g, "");

    switch (normalized) {
      case "text":
      case "string":
        return FieldType.Text;
      case "number":
      case "numeric":
        return FieldType.Number;
      case "checkbox":
      case "boolean":
      case "bool":
        return FieldType.Checkbox;
      case "url":
      case "link":
        return FieldType.Url;
      case "date":
      case "datetime":
        return FieldType.DateTime;
      case "createdtime":
        return FieldType.CreatedTime;
      default:
        return undefined;
    }
  }

  private getDeclaredFieldType(record: any, fieldName: string, value?: any): FieldType | undefined {
    const directValue = value ?? record?.[fieldName];

    if (this.isTypedFieldValue(directValue)) {
      return this.normalizeDeclaredFieldType(directValue.type);
    }

    const meta = record?.[FeishuTableService.FIELD_TYPE_META_KEY];
    if (!meta || typeof meta !== "object") {
      return undefined;
    }

    const candidates = [fieldName, this.sanitizeFieldName(fieldName)];
    for (const candidate of candidates) {
      if (candidate in meta) {
        const normalizedType = this.normalizeDeclaredFieldType(meta[candidate]);
        if (normalizedType !== undefined) {
          return normalizedType;
        }
      }
    }

    return undefined;
  }

  private async addRecords(
    table: any,
    data: any[],
    tableFields: any[],
    onProgress?: (progress: number, message: string) => void
  ): Promise<number> {
    const batchSize = 100; // 批量处理大小
    let totalAdded = 0;

    const totalBatches = Math.ceil(data.length / batchSize);
    console.log(`开始添加 ${data.length} 条记录，分 ${totalBatches} 批处理`);

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      // 报告批次进度
      if (onProgress) {
        const batchProgress = ((batchNumber - 1) / totalBatches) * 100;
        onProgress(
          batchProgress,
          `正在处理第 ${batchNumber}/${totalBatches} 批记录...`
        );
      }

      try {
        console.log(`处理第 ${batchNumber} 批，包含 ${batch.length} 条记录`);

        const records = batch.map((item, index) => {
          try {
            const fields = this.convertToTableFields(item, tableFields);
            this.logRecordBeforeInsert(i + index + 1, item, fields, tableFields);
            return { fields };
          } catch (convertError) {
            console.error(`转换记录 ${i + index + 1} 失败:`, convertError);
            throw convertError;
          }
        });

        await table.addRecords(records);
        totalAdded += records.length;
        console.log(
          `第 ${batchNumber} 批添加成功，共 ${records.length} 条记录`
        );

        // 报告批次完成进度
        if (onProgress) {
          const completedProgress = (batchNumber / totalBatches) * 100;
          onProgress(
            completedProgress,
            `第 ${batchNumber}/${totalBatches} 批记录添加完成`
          );
        }
      } catch (error) {
        console.error(`Failed to add batch ${batchNumber}:`, error);

        // 尝试逐条添加以找出问题记录
        console.log(`尝试逐条添加第 ${batchNumber} 批的记录...`);
        for (let j = 0; j < batch.length; j++) {
          try {
            const item = batch[j];
            const fields = this.convertToTableFields(item, tableFields);
            this.logRecordBeforeInsert(i + j + 1, item, fields, tableFields);
            // 使用单条记录添加方法，参考demo.vue的实现
            await table.addRecord({ fields });
            totalAdded += 1;
            console.log(`单条记录 ${i + j + 1} 添加成功`);
          } catch (singleError) {
            console.error(`单条记录 ${i + j + 1} 添加失败:`, singleError);
            console.error("问题记录数据:", batch[j]);

            // 详细分析字段匹配问题
            const recordFields = this.convertToTableFields(
              batch[j],
              tableFields
            );
            const recordFieldNames = Object.keys(recordFields);
            console.error("记录字段名:", recordFieldNames);

            // 重新获取表格字段进行比较
            try {
              const currentTableFields = await table.getFieldMetaList();
              const currentTableFieldNames = currentTableFields.map(
                (f: any) => f.name
              );
              console.error("当前表格字段名:", currentTableFieldNames);

              const missingFields = recordFieldNames.filter(
                (field) => !currentTableFieldNames.includes(field)
              );
              if (missingFields.length > 0) {
                console.error("记录中存在但表格中缺失的字段:", missingFields);
              }
            } catch (fieldCheckError) {
              console.error("检查字段时出错:", fieldCheckError);
            }
          }
        }
      }
    }

    console.log(`记录添加完成，总共成功添加 ${totalAdded} 条记录`);
    return totalAdded;
  }

  private logRecordBeforeInsert(
    recordIndex: number,
    rawData: any,
    fields: Record<string, any>,
    tableFields: any[]
  ): void {
    const fieldIdToNameMap = new Map<string, string>();
    tableFields.forEach((field) => {
      fieldIdToNameMap.set(field.id, field.name);
    });

    const readableFields = Object.entries(fields).reduce((result, [fieldId, value]) => {
      const fieldName = fieldIdToNameMap.get(fieldId) || fieldId;
      result[fieldName] = value;
      return result;
    }, {} as Record<string, any>);

    console.log(`[多维表格] 准备插入第 ${recordIndex} 行原始数据:`, rawData);
    console.log(`[多维表格] 准备插入第 ${recordIndex} 行转换后字段:`, readableFields);
  }

  private convertToTableFields(data: any, tableFields: any[]): any {
    const fields: any = {};

    // 创建字段名称到字段ID和类型的映射
    const fieldNameToIdMap = new Map<string, string>();
    const fieldIdToTypeMap = new Map<string, number>();
    tableFields.forEach((field) => {
      fieldNameToIdMap.set(field.name, field.id);
      fieldIdToTypeMap.set(field.id, field.type);
    });

    for (const [key, value] of Object.entries(data)) {
      if (key === FeishuTableService.FIELD_TYPE_META_KEY) {
        continue;
      }

      const rawValue = this.unwrapTypedFieldValue(value);

      // 跳过 null、undefined 和空字符串
      if (rawValue === null || rawValue === undefined || rawValue === "") {
        continue;
      }

      // 清理字段名称
      const sanitizedKey = this.sanitizeFieldName(key);

      // 查找对应的字段ID和类型
      const fieldId = fieldNameToIdMap.get(sanitizedKey);
      if (!fieldId) {
        console.warn(`未找到字段 "${sanitizedKey}" 对应的字段ID，跳过该字段`);
        continue;
      }

      const fieldType = fieldIdToTypeMap.get(fieldId);
      const declaredFieldType = this.getDeclaredFieldType(data, key, value);

      // 处理不同类型的值
      let processedValue = rawValue;

      try {
        if (
          declaredFieldType !== undefined &&
          fieldType !== undefined &&
          declaredFieldType !== fieldType
        ) {
          console.warn(
            `字段 "${sanitizedKey}" 的声明类型 ${declaredFieldType} 与表格现有类型 ${fieldType} 不一致，尝试按表格类型写入`
          );
        }

        // 特殊处理CreatedTime字段 - 跳过，让飞书自动处理
        if (fieldType === FieldType.CreatedTime) {
          continue;
        }

        // 特殊处理DateTime字段
        if (fieldType === FieldType.DateTime) {
          if (typeof rawValue === "string") {
            const trimmedValue = rawValue.trim();
            if (trimmedValue === "") {
              continue;
            }

            try {
              // 尝试解析日期字符串为时间戳（毫秒）
              const date = new Date(trimmedValue);
              if (!isNaN(date.getTime())) {
                processedValue = date.getTime();
              } else {
                console.warn(`无法解析DateTime字段 "${sanitizedKey}" 的值: "${trimmedValue}"`);
                continue;
              }
            } catch (dateError) {
              console.warn(`DateTime字段 "${sanitizedKey}" 解析失败:`, dateError);
              continue;
            }
          } else if (typeof rawValue === "number") {
            // 如果已经是数字，检查是否是有效的时间戳
            if (rawValue > 0 && isFinite(rawValue)) {
              // 如果是秒级时间戳，转换为毫秒
              processedValue = rawValue < 10000000000 ? rawValue * 1000 : rawValue;
            } else {
              continue;
            }
          } else {
            continue;
          }
        } else if (fieldType === FieldType.Number) {
          if (typeof rawValue === "number") {
            if (isNaN(rawValue) || !isFinite(rawValue)) {
              continue;
            }
            processedValue = rawValue;
          } else if (typeof rawValue === "string") {
            const normalizedValue = rawValue.replace(/,/g, "").trim();
            if (normalizedValue === "") {
              continue;
            }

            if (!this.isNumericString(normalizedValue)) {
              console.warn(`无法解析Number字段 "${sanitizedKey}" 的值: "${rawValue}"`);
              continue;
            }

            processedValue = Number(normalizedValue);
          } else {
            const numericValue = Number(rawValue);
            if (Number.isNaN(numericValue) || !Number.isFinite(numericValue)) {
              continue;
            }
            processedValue = numericValue;
          }
        } else if (typeof rawValue === "string") {
          // 清理字符串值
          processedValue = rawValue.trim();

          // 如果清理后为空，跳过
          if (processedValue === "") {
            continue;
          }

          // 对于URL字段，确保格式正确
          if (
            sanitizedKey.includes("链接") ||
            sanitizedKey.includes("头像") ||
            sanitizedKey.includes("封面")
          ) {
            const urlValue = String(processedValue);
            if (
              !urlValue.startsWith("http://") &&
              !urlValue.startsWith("https://")
            ) {
              // 如果不是有效URL，保持原值
              processedValue = urlValue;
            }
          }
        } else if (typeof rawValue === "number") {
          // 确保数字值有效
          if (isNaN(rawValue) || !isFinite(rawValue)) {
            continue;
          }
          // 对于过大的数字，转换为字符串
          if (rawValue > Number.MAX_SAFE_INTEGER) {
            processedValue = String(rawValue);
          }
        } else if (typeof rawValue === "boolean") {
          // 布尔值直接使用
          processedValue = rawValue;
        } else {
          // 其他类型转换为字符串
          processedValue = String(rawValue);
        }

        // 使用字段ID作为键，而不是字段名称
        fields[fieldId] = processedValue;
      } catch (processError) {
        console.warn(`处理字段 ${key} 时出错:`, processError);
        // 出错时跳过该字段
        continue;
      }
    }

    return fields;
  }
}
