import { formatDate } from '@/utils/dateFormat';

// 在照片详情组件中使用
<div className="text-sm text-gray-600">
  拍摄时间：{formatDate(photo.date, 'full')}
</div> 