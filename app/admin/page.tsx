'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Star, 
  MagnifyingGlass, 
  SortAscending, 
  SortDescending, 
  CloudArrowUp, 
  Spinner,
  Camera,
  Calendar,
  MapPin,
  Sliders,
  X,
  Clock,
  CheckCircle,
  XCircle,
  Info
} from '@phosphor-icons/react';
import { parseExifDate } from '@/app/utils/dateFormat';
import { updateImageStar } from '@/app/utils/dbUtils';
import { updateAlbumsJsonData } from '@/app/utils/ossUtils';

// 定义照片接口
interface Photo {
  id: string;
  url: string;
  title: string;
  location: string;
  date: string;
  parsedDate: Date | null;
  cameraModel: string;
  star: number;
  likes: number;
  album_id: string;
  album_title: string;
  exif?: {
    camera_model: string;
    lens_model: string;
    f_number: number;
    exposure_time: string;
    iso: number;
    focal_length: string;
    location: string;
    date_time: string;
    raw?: any;
  };
}

export default function AdminPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<'date' | 'star'>('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCamera, setFilterCamera] = useState<string>('all');
  const [cameras, setCameras] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

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
      
      // 处理照片数据
      const processedPhotos = data.photos.map((photo: any) => {
        // 解析日期
        const parsedDate = photo.date ? parseExifDate(photo.date) : null;
        
        return {
          id: photo.id,
          url: photo.url,
          title: photo.title || photo.album_title || '',
          location: photo.location || '',
          date: photo.date || '',
          parsedDate,
          cameraModel: photo.exif?.camera_model || '',
          star: photo.star || 0,
          likes: photo.likes || 0,
          album_id: photo.album_id,
          album_title: photo.album_title || '',
          exif: photo.exif
        };
      });
      
      // 提取所有相机型号
      const uniqueCameras = [...new Set(processedPhotos.map((p: Photo) => p.cameraModel).filter(Boolean))] as string[];
      setCameras(uniqueCameras);
      
      // 提取所有位置
      const uniqueLocations = [...new Set(processedPhotos.map((p: Photo) => p.location).filter(Boolean))] as string[];
      setLocations(uniqueLocations);
      
      setPhotos(processedPhotos);
    } catch (error) {
      console.error('加载照片时出错:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取最后同步时间
  const getLastSyncTime = async () => {
    try {
      // 添加时间戳参数，确保每次请求都是新的
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/files/lastModified?type=albums&_t=${timestamp}`);
      if (response.ok) {
        const data = await response.json();
        if (data.lastModified) {
          setLastSyncTime(data.lastModified);
        }
      }
    } catch (error) {
      console.error('获取最后同步时间失败:', error);
    }
  };

  useEffect(() => {
    loadPhotos();
    getLastSyncTime();
    
    // 点击外部关闭筛选面板
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 处理星级评分更新
  const handleStarUpdate = async (photoId: string, newStar: number) => {
    try {
      // 更新本地状态
      setPhotos(prevPhotos => 
        prevPhotos.map(photo => 
          photo.id === photoId ? { ...photo, star: newStar } : photo
        )
      );
      
      // 发送更新请求到服务器
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
      
      console.log(`照片 ${photoId} 的星级已更新为 ${newStar}`);
    } catch (error) {
      console.error('更新星级时出错:', error);
      // 如果失败，回滚本地状态
      loadPhotos();
    }
  };

  // 处理同步数据
  const handleSyncData = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    
    try {
      const result = await updateAlbumsJsonData();
      setSyncResult(result);
      
      if (result.success) {
        // 刷新照片数据和同步时间
        await loadPhotos();
        await getLastSyncTime();
      }
    } catch (error) {
      setSyncResult({ 
        success: false, 
        message: `同步失败: ${error instanceof Error ? error.message : String(error)}` 
      });
    } finally {
      setSyncLoading(false);
    }
  };

  // 格式化日期时间
  const formatDateTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return '未知';
    
    try {
      const date = new Date(dateTimeStr);
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.warn('无效的日期字符串:', dateTimeStr);
        return '未知';
      }
      
      // 将UTC时间转换为东八区时间
      // 创建一个新的日期对象，加上8小时的时差
      const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
      
      // 格式化北京时间
      return beijingDate.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (e) {
      console.error('格式化日期时出错:', e);
      return dateTimeStr;
    }
  };

  // 筛选和排序照片
  const filteredAndSortedPhotos = photos
    .filter(photo => {
      // 搜索过滤
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        !searchTerm || 
        photo.title.toLowerCase().includes(searchLower) ||
        photo.location.toLowerCase().includes(searchLower) ||
        photo.album_title.toLowerCase().includes(searchLower);
      
      // 相机过滤
      const matchesCamera = filterCamera === 'all' || photo.cameraModel === filterCamera;
      
      // 位置过滤
      const matchesLocation = filterLocation === 'all' || photo.location === filterLocation;
      
      return matchesSearch && matchesCamera && matchesLocation;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = a.parsedDate ? a.parsedDate.getTime() : 0;
        const dateB = b.parsedDate ? b.parsedDate.getTime() : 0;
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        return sortOrder === 'asc' ? a.star - b.star : b.star - a.star;
      }
    });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      <div className="container mx-auto px-4 py-8">
        {/* 顶部导航和标题 */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Camera size={28} className="mr-2 text-blue-500" />
              摄影管理系统
            </h1>
            
            <div className="flex flex-wrap gap-3">
              <motion.button
                onClick={handleSyncData}
                disabled={syncLoading}
                whileHover={!syncLoading ? { scale: 1.02 } : {}}
                whileTap={!syncLoading ? { scale: 0.98 } : {}}
                className={`px-4 py-2 rounded-lg flex items-center justify-center ${
                  syncLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md'
                } transition-all`}
              >
                {syncLoading ? (
                  <>
                    <Spinner size={18} className="animate-spin mr-2" />
                    同步中...
                  </>
                ) : (
                  <>
                    <CloudArrowUp size={18} className="mr-2" />
                    同步 OSS 数据
                  </>
                )}
              </motion.button>
              
              <Link 
                href="/admin/oss" 
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center"
              >
                <Info size={18} className="mr-2" />
                OSS 详细信息
              </Link>
            </div>
          </div>
          
          {/* 同步状态和时间 */}
          <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Clock size={16} className="mr-2" />
            <span>上次同步时间：</span>
            <span className="ml-1 font-medium">
              {lastSyncTime ? formatDateTime(lastSyncTime) : '从未同步'}
            </span>
          </div>
          
          {/* 同步结果提示 */}
          {syncResult && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`mt-4 p-3 rounded-md flex items-start ${
                syncResult.success ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {syncResult.success ? (
                <CheckCircle size={18} weight="fill" className="mr-2 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle size={18} weight="fill" className="mr-2 mt-0.5 flex-shrink-0" />
              )}
              <div>
                {syncResult.message}
              </div>
            </motion.div>
          )}
        </motion.div>
        
        {/* 搜索和筛选 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* 搜索框 */}
            <div className="relative flex-grow">
              <MagnifyingGlass size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索照片标题、位置或相册..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            {/* 排序控制 */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'star')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="date">按日期</option>
                <option value="star">按星级</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                title={sortOrder === 'asc' ? '升序' : '降序'}
              >
                {sortOrder === 'asc' ? <SortAscending size={20} /> : <SortDescending size={20} />}
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex items-center"
                  title="更多筛选"
                >
                  <Sliders size={20} />
                </button>
                
                {showFilters && (
                  <motion.div 
                    ref={filtersRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-10 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-gray-900 dark:text-white">高级筛选</h3>
                      <button 
                        onClick={() => setShowFilters(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          相机型号
                        </label>
                        <select
                          value={filterCamera}
                          onChange={(e) => setFilterCamera(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="all">所有相机</option>
                          {cameras.map(camera => (
                            <option key={camera} value={camera}>{camera}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          拍摄位置
                        </label>
                        <select
                          value={filterLocation}
                          onChange={(e) => setFilterLocation(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="all">所有位置</option>
                          {locations.map(location => (
                            <option key={location} value={location}>{location}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
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
            
            {filterCamera !== 'all' && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                <Camera size={14} className="mr-1" />
                <span className="font-medium">{filterCamera}</span>
                <button 
                  onClick={() => setFilterCamera('all')}
                  className="ml-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            {filterLocation !== 'all' && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <MapPin size={14} className="mr-1" />
                <span className="font-medium">{filterLocation}</span>
                <button 
                  onClick={() => setFilterLocation('all')}
                  className="ml-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          
          {/* 照片数量统计 */}
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            共 {filteredAndSortedPhotos.length} 张照片
            {(searchTerm || filterCamera !== 'all' || filterLocation !== 'all') && ' (已筛选)'}
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
                尝试调整筛选条件或清除搜索关键词
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedPhotos.map((photo) => (
                <motion.div 
                  key={photo.id} 
                  whileHover={{ y: -5 }}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all"
                >
                  {/* 照片预览 */}
                  <div className="relative aspect-[4/3] group">
                    <Image
                      src={photo.url}
                      alt={photo.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    
                    {/* 悬停时显示的信息 */}
                    <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <div className="text-white text-sm mb-2">
                        <div className="flex items-center mb-1">
                          <Calendar size={14} className="mr-1" />
                          {photo.date ? new Date(photo.date).toLocaleDateString() : '无日期'}
                        </div>
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-1" />
                          {photo.location || '无位置信息'}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-white text-xs">
                          {photo.album_title}
                        </div>
                        <div className="text-white text-xs flex items-center">
                          <Camera size={12} className="mr-1" />
                          {photo.cameraModel || '未知相机'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 照片信息 */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate" title={photo.title}>
                        {photo.title || '无标题'}
                      </h3>
                    </div>
                    
                    {/* 星级评分 */}
                    <div className="flex items-center justify-between">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleStarUpdate(photo.id, star)}
                            className={`w-6 h-6 transition-colors ${
                              star <= photo.star
                                ? 'text-yellow-400 hover:text-yellow-500'
                                : 'text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500'
                            }`}
                          >
                            <Star weight={star <= photo.star ? "fill" : "regular"} size={20} />
                          </button>
                        ))}
                      </div>
                      
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <span className="mr-1">❤️</span>
                        {photo.likes}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
} 