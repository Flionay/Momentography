/**
 * 将 EXIF 格式的日期字符串转换为标准格式的 Date 对象
 * @param exifDate EXIF格式的日期字符串 (e.g., "2021:07:10 09:20:23")
 * @returns Date对象或null
 */
export function parseExifDate(exifDate: string | null | undefined): Date | null {
  if (!exifDate) return null;
  
  try {
    const [date, time] = exifDate.split(' ');
    const standardDate = date.replace(/:/g, '-'); // 2021:07:10 -> 2021-07-10
    const standardDateTime = `${standardDate}T${time}`; // 2021-07-10T09:20:23
    
    const parsedDate = new Date(standardDateTime);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  } catch (error) {
    console.error('EXIF日期解析错误:', error);
    return null;
  }
}

/**
 * 格式化日期为友好的显示格式
 * @param date Date对象或EXIF格式的日期字符串
 * @param format 输出格式 ('full' | 'yearMonth' | 'year')
 * @returns 格式化后的字符串
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: 'full' | 'yearMonth' | 'year' = 'yearMonth'
): string {
  try {
    let dateObj: Date | null;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = parseExifDate(date);
    } else {
      return '未知时间';
    }

    if (!dateObj) return '未知时间';

    const formatOptions: Intl.DateTimeFormatOptions = {
      full: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      },
      yearMonth: {
        year: 'numeric',
        month: 'long'
      },
      year: {
        year: 'numeric'
      }
    }[format];

    return new Intl.DateTimeFormat('zh-CN', formatOptions).format(dateObj);
  } catch (error) {
    console.error('日期格式化错误:', error);
    return '未知时间';
  }
}

/**
 * 获取相对时间描述
 * @param date Date对象或EXIF格式的日期字符串
 * @returns 相对时间描述
 */
export function getRelativeTimeString(date: Date | string | null | undefined): string {
  const dateObj = typeof date === 'string' ? parseExifDate(date) : date;
  if (!dateObj) return '未知时间';

  const rtf = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });
  const now = new Date();
  const diff = dateObj.getTime() - now.getTime();
  const diffDays = Math.round(diff / (1000 * 60 * 60 * 24));
  const diffMonths = Math.round(diff / (1000 * 60 * 60 * 24 * 30));
  const diffYears = Math.round(diff / (1000 * 60 * 60 * 24 * 365));

  if (Math.abs(diffYears) >= 1) {
    return rtf.format(diffYears, 'year');
  } else if (Math.abs(diffMonths) >= 1) {
    return rtf.format(diffMonths, 'month');
  } else {
    return rtf.format(diffDays, 'day');
  }
} 