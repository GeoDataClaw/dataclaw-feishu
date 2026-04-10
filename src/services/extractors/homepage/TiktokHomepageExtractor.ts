import { formatDuration, formatTimestamp } from '../../../lib/utils';
import {
  BasePlatformExtractor,
  Platform,
  ExtractOptions,
  ExtractResult,
  InsufficientCreditsError,
} from '../../DataExtractor';
import { ProxyUtils } from '../../../lib/ProxyUtils';

export class TiktokHomepageExtractor extends BasePlatformExtractor {
  protected platform: Platform = 'tiktok';
  protected extractType = 'homepage';

  constructor(options: ExtractOptions) {
    super(options);
  }

  async extract(url: string): Promise<ExtractResult> {
    try {
      const reportProgress = (progress: number, message: string) => {
        if (this.options.onProgress && typeof this.options.onProgress === 'function') {
          this.options.onProgress(progress, message);
        }
      };

      reportProgress(0, '开始提取数据...');

      const allData: any[] = [];
      let currentPage = 1;
      let hasNextPage = true;
      let cursor: string | undefined = undefined;
      const maxPages = this.options.range === 'all' ? 100 : (this.options.range as number);

      const userInfoResult = await this.makeRequest('/tiktok/user/info', { url });
      const userInfo = userInfoResult.data.userInfo;
      const authorName = userInfo.user?.nickname || '';

      if (authorName) {
        reportProgress(5, `正在提取 ${authorName} 的主页数据...`);
      }

      while (hasNextPage && currentPage <= maxPages) {
        const pageProgress = ((currentPage - 1) / maxPages) * 90;
        reportProgress(pageProgress, `正在提取第 ${currentPage} 页数据...`);
        console.log(`正在提取第 ${currentPage} 页数据...`);

        const payload: Record<string, unknown> = {
          secUserId: userInfo.user?.secUid,
        };

        if (cursor !== undefined && currentPage > 1) {
          payload.cursor = cursor;
          console.log(`使用 cursor 进行翻页: ${cursor}`);
        }

        try {
          const result = await this.makeRequest(this.getApiEndpoint(), payload);

          if (!result.data || !Array.isArray(result.data.itemList) || result.data.itemList.length === 0) {
            console.log('没有更多数据，停止分页');
            break;
          }

          const itemList = result.data.itemList;
          allData.push(...itemList);
          console.log(`第 ${currentPage} 页获取到 ${itemList.length} 条数据`);

          hasNextPage = result.data.hasMorePrevious === true;

          if (hasNextPage && itemList.length > 0) {
            const lastItem = itemList[itemList.length - 1];
            if (lastItem.createTime) {
              cursor = String(lastItem.createTime);
              console.log(`更新 cursor 为最后一条数据的 createTime: ${cursor}`);
            }
          }

          if (this.options.startDate && !this.shouldContinueNextPage(itemList, this.options.startDate)) {
            console.log('达到时间边界，停止分页');
            break;
          }

          currentPage++;

          if (hasNextPage) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          if (error instanceof InsufficientCreditsError) {
            return await this.handleInsufficientCredits(error, allData, currentPage, reportProgress);
          }
          throw error;
        }
      }

      reportProgress(90, '正在格式化数据...');
      const formattedData = await this.formatData(allData);

      reportProgress(100, '数据提取完成');

      return {
        success: true,
        data: formattedData,
        totalCount: allData.length,
        platform: 'TikTok',
        extractType: this.extractType,
        message: `TikTok 主页数据提取成功，共获取 ${allData.length} 条数据（${currentPage - 1} 页）`,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : 'TikTok 主页数据提取失败',
      };
    }
  }

  protected getApiEndpoint(): string {
    return '/tiktok/user/posts';
  }

  protected getTypeDisplayName(data?: any[]): string {
    if (data && data.length > 0) {
      const firstItem = data[0];
      const authorName = firstItem['作者'] || firstItem.author?.nickname || '';
      if (authorName) {
        return `TikTok主页_${authorName}`;
      }
    }
    return 'TikTok主页';
  }

  private shouldContinueNextPage(itemList: any[], originalStartDate?: string): boolean {
    if (!itemList || itemList.length === 0) {
      return false;
    }

    if (!originalStartDate) {
      return true;
    }

    const originalDate = new Date(originalStartDate);
    const validItems = itemList
      .filter(item => item.createTime)
      .sort((a, b) => b.createTime - a.createTime);

    if (validItems.length === 0) {
      console.log('当前页没有有效时间数据，继续下一页');
      return true;
    }

    const lastItem = validItems[validItems.length - 1];
    const lastItemDate = new Date(lastItem.createTime * 1000);
    const shouldStop = lastItemDate <= originalDate;

    if (shouldStop) {
      console.log(`最后一条数据时间 ${lastItemDate.toLocaleString()} 早于或等于 startDate (${originalStartDate})，停止分页`);
      return false;
    }

    console.log(`最后一条数据时间 ${lastItemDate.toLocaleString()} 晚于 startDate，继续下一页`);
    return true;
  }

  protected async formatData(itemList: any[]): Promise<any[]> {
    let filteredList = itemList;

    if (this.options.startDate) {
      const startDateTime = new Date(this.options.startDate);
      filteredList = itemList.filter(item => {
        if (!item.createTime) return true;

        const itemDate = new Date(item.createTime * 1000);
        const shouldInclude = itemDate > startDateTime;

        if (!shouldInclude) {
          console.log(`过滤掉早于 startDate 的数据: ${formatTimestamp(item.createTime)} <= ${this.options.startDate}`);
        }

        return shouldInclude;
      });

      console.log(`startDate 过滤: 原始数据 ${itemList.length} 条，过滤后 ${filteredList.length} 条`);
    }

    const formattedItems = [];

    for (const item of filteredList) {
      const awemeId = this.pickFirstValue(item.id, item.aweme_id) || '';
      const videoId = this.pickFirstValue(
        item.video?.id,
        awemeId,
      ) || '';
      const description = this.pickFirstNonEmptyString(
        item.desc,
        item.contents?.[0]?.desc,
        item.contents?.map((content: any) => content?.desc).find((desc: string) => !!desc),
      );
      const authorName = this.pickFirstNonEmptyString(item.author?.nickname, item.author?.uniqueId);
      const authorUniqueId = this.pickFirstNonEmptyString(item.author?.uniqueId, item.author?.unique_id);

      const baseData: any = {
        平台: 'TikTok',
        视频ID: videoId,
        描述: description,
        链接: authorUniqueId && awemeId ? `https://www.tiktok.com/@${authorUniqueId}/video/${awemeId}` : '',
        发布时间: formatTimestamp(item.createTime),
        点赞数: this.formatCount(item.stats?.diggCount, item.statsV2?.diggCount),
        评论数: this.formatCount(item.stats?.commentCount, item.statsV2?.commentCount),
        分享数: this.formatCount(item.stats?.shareCount, item.statsV2?.shareCount),
        播放数: this.formatCount(item.stats?.playCount, item.statsV2?.playCount),
        收藏数: this.formatCount(item.stats?.collectCount, item.statsV2?.collectCount),
        作者: authorName,
        作者头像: this.pickFirstNonEmptyString(
          item.author?.avatarThumb,
          item.author?.avatarMedium,
          item.author?.avatarLarger,
        ),
        粉丝数: this.formatCount(item.authorStats?.followerCount, item.authorStatsV2?.followerCount),
        关注数: this.formatCount(item.authorStats?.followingCount, item.authorStatsV2?.followingCount),
        获赞总数: this.formatCount(
          item.authorStats?.heartCount,
          item.authorStats?.heart,
          item.authorStatsV2?.heartCount,
          item.authorStatsV2?.heart,
        ),
        视频数量: this.formatCount(item.authorStats?.videoCount, item.authorStatsV2?.videoCount),
        视频时长: this.formatVideoDuration(item),
        视频封面: this.pickFirstNonEmptyString(
          item.video?.cover,
          item.video?.originCover,
          item.video?.dynamicCover,
        ),
        音乐标题: item.music?.title || '',
        音乐作者: item.music?.authorName || '',
        // 音乐链接: await ProxyUtils.smartProxyUrl(item.music?.playUrl, 'tiktok') || '',
        话题: this.extractHashtags(item),
        语言: item.textLanguage || '',
        // 字幕信息: await this.formatSubtitleInfo(
        //   videoId || awemeId,
        //   item.video?.subtitleInfos || item.video?.claInfo?.captionInfos,
        // ),
      };

      baseData['提取时间'] = Date.now();
      baseData['__fieldTypes'] = {
        平台: 'text',
        视频ID: 'text',
        描述: 'text',
        链接: 'url',
        发布时间: 'datetime',
        点赞数: 'text',
        评论数: 'text',
        分享数: 'text',
        播放数: 'text',
        收藏数: 'text',
        作者: 'text',
        作者头像: 'url',
        粉丝数: 'text',
        关注数: 'text',
        获赞总数: 'text',
        视频数量: 'text',
        视频时长: 'text',
        视频封面: 'url',
        音乐标题: 'text',
        音乐作者: 'text',
        // 音乐链接: 'url',
        话题: 'text',
        语言: 'text',
        提取时间: 'createdTime',
      };
      formattedItems.push(baseData);
    }

    return formattedItems;
  }

  private pickFirstValue<T>(...values: T[]): T | undefined {
    return values.find(value => value !== undefined && value !== null && value !== '');
  }

  private pickFirstNonEmptyString(...values: any[]): string {
    const value = values.find(item => typeof item === 'string' && item.trim().length > 0);
    return value || '';
  }

  private formatCount(...values: any[]): number {
    const value = this.pickFirstValue(...values);

    if (value === undefined) {
      return 0;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const normalizedValue = value.replace(/,/g, '').trim();
      const numericValue = Number(normalizedValue);
      return Number.isNaN(numericValue) ? 0 : numericValue;
    }

    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? 0 : numericValue;
  }

  private formatVideoDuration(item: any): string {
    const duration = this.pickFirstValue(
      item.video?.duration,
      item.music?.duration,
      item.music?.shoot_duration,
    );

    if (typeof duration === 'number' && duration > 0) {
      return formatDuration(duration);
    }

    if (typeof duration === 'string' && duration.trim()) {
      const numericDuration = Number(duration);
      if (!Number.isNaN(numericDuration) && numericDuration > 0) {
        return formatDuration(numericDuration);
      }
    }

    return '';
  }

  private extractHashtags(item: any): string {
    const hashtags: string[] = [];

    if (item.challenges && Array.isArray(item.challenges)) {
      hashtags.push(...item.challenges.map((challenge: any) => challenge.title).filter(Boolean));
    }

    if (item.textExtra && Array.isArray(item.textExtra)) {
      hashtags.push(
        ...item.textExtra
          .filter((extra: any) => extra.type === 1 && extra.hashtagName)
          .map((extra: any) => extra.hashtagName)
      );
    }

    if (item.contents && Array.isArray(item.contents)) {
      for (const content of item.contents) {
        if (content?.textExtra && Array.isArray(content.textExtra)) {
          hashtags.push(
            ...content.textExtra
              .filter((extra: any) => extra.type === 1 && extra.hashtagName)
              .map((extra: any) => extra.hashtagName)
          );
        }
      }
    }

    return [...new Set(hashtags)].join(', ');
  }

  private async formatSubtitleInfo(itemId: string, subtitleInfos: any[]): Promise<string> {
    if (!subtitleInfos || !Array.isArray(subtitleInfos) || subtitleInfos.length === 0) {
      return '';
    }

    const subtitleDetails = [];

    for (const subtitle of subtitleInfos) {
      const details: string[] = [];
      const languageCode = subtitle.LanguageCodeName || subtitle.language || '';
      const subtitleFormat = subtitle.Format || subtitle.captionFormat || '';
      const subtitleUrl = subtitle.Url || subtitle.url || '';

      if (languageCode) {
        details.push(`语言: ${languageCode}`);
      }

      if (subtitleFormat) {
        details.push(`格式: ${subtitleFormat}`);
      }

      if (subtitleUrl) {
        const downloadUrl = await ProxyUtils.buildDownloadProxyUrl(
          subtitleUrl,
          3600,
          'tiktok',
          '',
          `${itemId}_${languageCode || 'subtitle'}.${subtitleFormat || 'txt'}`
        ) || '';
        details.push(`链接: ${downloadUrl}`);
      }

      subtitleDetails.push(details.join(', '));
    }

    return subtitleDetails.join(' | ');
  }
}
