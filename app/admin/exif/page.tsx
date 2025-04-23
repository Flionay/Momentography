'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Camera, 
  MagnifyingGlass, 
  SortAscending, 
  SortDescending,
  PencilSimple,
  CheckCircle,
  XCircle,
  X,
  Warning
} from '@phosphor-icons/react';
import PhotoDetail from '@/app/components/PhotoDetail';

interface Photo {
  id: string;
  url: string;
  title?: string;
  location?: string;
  date?: string;
  star?: number;
  album_id?: string;
  album_title?: string;
  exif?: {
    camera_model?: string | null;
    lens_model?: string | null;
    f_number?: number | null;
    exposure_time?: string | null;
    iso?: number | null;
    focal_length?: string | null;
    location?: string | null;
    date_time?: string | null;
    raw_data?: string | null;
    raw?: any;
  };
}

export default function ExifManagementPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{
    success: boolean;
    message: string;
    photoId?: string;
  } | null>(null);
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);

  // 加载照片数据
  const loadPhotos = async () => {
    try {
      setLoading(true);
      
      // 从 API 获取照片数据
      const response = await fetch('/api/photos/list?withExif=true');
      
      if (!response.ok) {
        throw new Error('获取照片数据失败');
      }
      
      const data = await response.json();
      setPhotos(data.photos);
    } catch (error) {
      console.error('加载照片时出错:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  // 处理照片点击事件
  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  // 处理照片详情关闭事件
  const handlePhotoDetailClose = () => {
    setSelectedPhoto(null);
  };

  // 处理星级更新
  const handleStarUpdate = async (photoId: string, newStar: number) => {
    try {
      // 调用API更新星级
      const response = await fetch('/api/photos/update-star', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoId, star: newStar }),
      });
      
      if (!response.ok) {
        throw new Error('更新星级失败');
      }
      
      // 更新本地状态
      setPhotos(prevPhotos => 
        prevPhotos.map(photo => 
          photo.id === photoId ? { ...photo, star: newStar } : photo
        )
      );
    } catch (error) {
      console.error('更新星级失败:', error);
      throw error;
    }
  };

  // 筛选和排序照片
  const filteredAndSortedPhotos = photos
    .filter(photo => {
      // 搜索过滤
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          (photo.title && photo.title.toLowerCase().includes(searchLower)) ||
          (photo.location && photo.location.toLowerCase().includes(searchLower)) ||
          (photo.album_title && photo.album_title.toLowerCase().includes(searchLower)) ||
          (photo.exif?.camera_model && photo.exif.camera_model.toLowerCase().includes(searchLower)) ||
          (photo.exif?.lens_model && photo.exif.lens_model.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }
      
      // 只显示不完善的照片
      if (showOnlyIncomplete) {
        return !isExifComplete(photo.exif);
      }
      
      return true;
    })
    .sort((a, b) => {
      // 按照EXIF完善度排序
      const aCompleteness = calculateExifCompleteness(a.exif);
      const bCompleteness = calculateExifCompleteness(b.exif);
      
      // 根据排序顺序决定如何排序
      if (sortOrder === 'asc') {
        // 升序：完善度低的在前面
        return aCompleteness - bCompleteness;
      } else {
        // 降序：完善度高的在前面
        return bCompleteness - aCompleteness;
      }
    });

  // 检查EXIF数据是否完善
  const isExifComplete = (exif?: Photo['exif']): boolean => {
    if (!exif) return false;
    
    // 检查关键EXIF字段是否存在且不为null或"未知"
    const requiredFields = [
      'camera_model',
      'lens_model',
      'f_number',
      'exposure_time',
      'iso',
      'focal_length',
      'location',
      'date_time'
    ];
    
    for (const field of requiredFields) {
      const value = exif[field as keyof typeof exif];
      if (!value || 
          (typeof value === 'string' && value.toLowerCase().includes('未知')) ||
          value === null) {
        return false;
      }
    }
    
    return true;
  };

  // 计算EXIF完善度
  const calculateExifCompleteness = (exif?: Photo['exif']): number => {
    if (!exif) return 0;
    
    const requiredFields = [
      'camera_model',
      'lens_model',
      'f_number',
      'exposure_time',
      'iso',
      'focal_length',
      'location',
      'date_time'
    ];
    
    let completedFields = 0;
    
    for (const field of requiredFields) {
      const value = exif[field as keyof typeof exif];
      if (value && 
          !(typeof value === 'string' && value.toLowerCase().includes('未知')) &&
          value !== null) {
        completedFields++;
      }
    }
    
    return Math.round((completedFields / requiredFields.length) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">EXIF 数据管理</h1>
          <Link 
            href="/admin" 
            className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft size={20} className="mr-1" />
            返回管理面板
          </Link>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative flex-grow">
              <MagnifyingGlass size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索照片标题、位置、相机型号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  showOnlyIncomplete 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' 
                    : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <Warning size={18} className="mr-2" />
                {showOnlyIncomplete ? '只看不完善' : '显示不完善照片'}
              </button>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex items-center"
                title={sortOrder === 'asc' ? '完善度升序' : '完善度降序'}
              >
                {sortOrder === 'asc' ? <SortAscending size={20} /> : <SortDescending size={20} />}
                <span className="ml-2 hidden md:inline">
                  {sortOrder === 'asc' ? '完善度低→高' : '完善度高→低'}
                </span>
              </button>
            </div>
          </div>
          
          {/* 活跃筛选器标签 */}
          <div className="flex flex-wrap gap-2 mt-4">
            {searchTerm && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                <span className="mr-1">搜索:</span>
                <span className="font-medium">{searchTerm}</span>
                <button 
                  onClick={() => setSearchTerm('')}
                  className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            {showOnlyIncomplete && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                <Warning size={14} className="mr-1" />
                <span className="font-medium">只看不完善</span>
                <button 
                  onClick={() => setShowOnlyIncomplete(false)}
                  className="ml-2 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          
          {updateStatus && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`mt-4 p-3 rounded-md flex items-start ${
                updateStatus.success ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {updateStatus.success ? (
                <CheckCircle size={18} weight="fill" className="mr-2 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle size={18} weight="fill" className="mr-2 mt-0.5 flex-shrink-0" />
              )}
              <div>
                {updateStatus.message}
              </div>
            </motion.div>
          )}
          
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            共 {filteredAndSortedPhotos.length} 张照片
            {(searchTerm || showOnlyIncomplete) && ' (已筛选)'}
          </div>
        </motion.div>
        
        {/* 照片列表 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">加载照片中...</p>
            </div>
          ) : filteredAndSortedPhotos.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <Camera size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">没有找到照片</h3>
              <p className="text-gray-500 dark:text-gray-400">
                尝试调整搜索关键词
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedPhotos.map((photo) => (
                <motion.div 
                  key={photo.id} 
                  whileHover={{ y: -5 }}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => handlePhotoClick(photo)}
                >
                  {/* 照片预览 */}
                  <div className="relative aspect-[4/3] group">
                    <Image
                      src={photo.url}
                      alt={photo.title || ""}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    
                    {/* EXIF状态标记 */}
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                      isExifComplete(photo.exif)
                        ? 'bg-green-500 text-white'
                        : photo.exif && calculateExifCompleteness(photo.exif) > 50
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                    }`}>
                      {isExifComplete(photo.exif)
                        ? 'EXIF 已完善'
                        : photo.exif && calculateExifCompleteness(photo.exif) > 0
                          ? `完善度 ${calculateExifCompleteness(photo.exif)}%`
                          : 'EXIF 缺失'}
                    </div>
                    
                    {/* 编辑按钮 */}
                    <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePhotoClick(photo);
                        }}
                      >
                        <PencilSimple size={18} className="mr-2" />
                        编辑 EXIF
                      </button>
                    </div>
                  </div>
                  
                  {/* 照片信息 */}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate mb-2" title={photo.title}>
                      {photo.title || photo.album_title || '无标题'}
                    </h3>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {photo.exif?.camera_model && (
                        <div className="flex items-center">
                          <Camera size={14} className="mr-1 flex-shrink-0" />
                          <span className="truncate">{photo.exif.camera_model}</span>
                        </div>
                      )}
                      
                      {photo.album_title && (
                        <div className="truncate text-xs">
                          相册: {photo.album_title}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
      
      {/* 照片详情弹窗 */}
      {selectedPhoto && (
        <PhotoDetail
          photo={selectedPhoto}
          isOpen={!!selectedPhoto}
          onClose={handlePhotoDetailClose}
          onStarUpdate={handleStarUpdate}
          onRefresh={loadPhotos}
        />
      )}
    </div>
  );
} 