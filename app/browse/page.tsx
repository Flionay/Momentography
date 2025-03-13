'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Camera, MapPin, Calendar, Star, Heart, X } from '@phosphor-icons/react';
import { Dialog } from '@headlessui/react';
import { formatDate, parseExifDate } from '@/app/utils/dateFormat';
import 'leaflet/dist/leaflet.css';
import AMapContainer from '@/app/components/AMapContainer';
import { MAP_CONFIG } from '@/app/config/map';

// 在组件内部动态导入 Leaflet
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  
  // 修复 Leaflet 图标问题
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/images/marker-icon-2x.png',
    iconUrl: '/images/marker-icon.png',
    shadowUrl: '/images/marker-shadow.png',
  });
}

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
  coordinates?: [number, number];
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

// 坐标转换函数 - WGS84 转 GCJ02
const transformCoordinates = (coordinates: [number, number]): [number, number] => {
  // 确保坐标是有效的
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2 ||
      typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number' ||
      isNaN(coordinates[0]) || isNaN(coordinates[1])) {
    console.error('无效的坐标:', coordinates);
    return MAP_CONFIG.CHINA_CENTER; // 返回默认中心点
  }
  
  // 这里可以添加 WGS84 到 GCJ02 的转换逻辑
  // EXIF 中的坐标通常是 WGS84 格式，而高德地图使用 GCJ02
  // 为了简化示例，这里暂时直接返回原坐标
  return coordinates;
};

// 解析GPS坐标的函数
const parseGPSCoordinates = (exifData: any): [number, number] | null => {
  try {
    if (exifData && exifData.raw && exifData.raw.Latitude && exifData.raw.Longitude) {
      const lat = exifData.raw.Latitude;
      const lon = exifData.raw.Longitude;
      
      // 确保坐标是有效的数字
      if (typeof lat === 'number' && typeof lon === 'number' && 
          !isNaN(lat) && !isNaN(lon) && 
          lat !== null && lon !== null) {
        return [lat, lon];
      }
    }
    return null;
  } catch (error) {
    console.error('解析GPS坐标失败:', error);
    return null;
  }
};

export default function BrowsePage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'star'>('date');
  const [filterCamera, setFilterCamera] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [cameras, setCameras] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [clickedPhotos, setClickedPhotos] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadPhotos() {
      try {
        setIsLoading(true);
        
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
          
          // 解析 GPS 坐标
          const coordinates = photo.exif ? parseGPSCoordinates(photo.exif) : null;
          
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
            coordinates,
            exif: photo.exif
          };
        });
        
        // 提取所有相机型号和地点
        const uniqueCameras = [...new Set(processedPhotos.map((p: Photo) => p.cameraModel).filter(Boolean))] as string[];
        const uniqueLocations = [...new Set(processedPhotos.map((p: Photo) => p.location).filter(Boolean))] as string[];
        
        setCameras(uniqueCameras);
        setLocations(uniqueLocations);
        setPhotos(processedPhotos);
      } catch (error) {
        console.error('加载照片时出错:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPhotos();
  }, []);

  // 筛选和排序照片
  const filteredAndSortedPhotos = photos
    .filter(photo => 
      (filterCamera === 'all' || photo.cameraModel === filterCamera) &&
      (filterLocation === 'all' || photo.location === filterLocation)
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = a.parsedDate ? a.parsedDate.getTime() : 0;
        const dateB = b.parsedDate ? b.parsedDate.getTime() : 0;
        return dateB - dateA; // 从新到旧
      }
      return b.star - a.star; // 星级从高到低
    });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  // 处理点赞功能
  const handleLike = async (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发照片选择
    
    // 更新状态
    setPhotos(prevPhotos => {
      return prevPhotos.map(photo => {
        if (photo.id === photoId) {
          // 增加点赞数
          const newLikes = photo.likes + 1;
          
          // 将点赞数据写入服务器
          fetch('/api/like', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ photoId, likes: newLikes }),
          }).catch(error => {
            console.error('保存点赞数据失败:', error);
          });
          
          // 记录当前页面已点击的照片
          const newClickedPhotos = new Set(clickedPhotos);
          newClickedPhotos.add(photoId);
          setClickedPhotos(newClickedPhotos);
          
          return { ...photo, likes: newLikes };
        }
        return photo;
      });
    });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'star')}
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm 
            dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        >
          <option value="date">按时间排序</option>
          <option value="star">按评分排序</option>
        </select>
        
        <select
          value={filterCamera}
          onChange={(e) => setFilterCamera(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm 
            dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        >
          <option value="all">所有相机</option>
          {cameras.map(camera => (
            <option key={camera} value={camera}>{camera}</option>
          ))}
        </select>
        
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm 
            dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        >
          <option value="all">所有地点</option>
          {locations.map(location => (
            <option key={location} value={location}>{location}</option>
          ))}
        </select>
      </div>

        {/* 照片网格 */}
        {isLoading ? (
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredAndSortedPhotos.map((photo) => (
              <motion.div
                key={photo.id}
                variants={itemVariants}
                className="group"
              >
                <div 
                  className="relative aspect-[4/3] overflow-hidden rounded-lg cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <Image
                    src={photo.url}
                    alt={photo.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105 duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  
                  {/* 悬停时显示的星级评分 - 只在底部添加阴影 */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-4 h-4 ${i < photo.star ? 'text-yellow-400' : 'text-gray-400'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 flex items-center justify-between">
                  {/* 左侧显示地址信息 */}
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin size={14} className="mr-1" />
                    <span className="truncate max-w-[150px]">{photo.location}</span>
                  </div>
                  
                  {/* 右侧显示爱心点赞图标和数量 */}
                  <button 
                    onClick={(e) => handleLike(e, photo.id)}
                    className="flex items-center group/like relative"
                  >
                    {/* 点赞爱心特效 - 每次点击都显示 */}
                    <motion.div
                      key={photo.likes} // 使用点赞数作为key，确保每次点击都触发动画
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 1, 0] }}
                      transition={{ duration: 0.8 }}
                      className="absolute -top-4 -right-4 pointer-events-none"
                    >
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ x: 0, y: 0, opacity: 1 }}
                          animate={{ 
                            x: Math.random() * 40 - 20, 
                            y: Math.random() * -30 - 10, 
                            opacity: 0 
                          }}
                          transition={{ duration: Math.random() * 0.8 + 0.5, delay: Math.random() * 0.2 }}
                          className="absolute text-red-500"
                        >
                          <Heart weight="fill" size={10} />
                        </motion.div>
                      ))}
                    </motion.div>
                    
                    <motion.div
                      whileTap={{ scale: 1.5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Heart 
                        weight={clickedPhotos.has(photo.id) ? "fill" : "regular"} 
                        className={`${clickedPhotos.has(photo.id) ? 'text-red-500' : 'text-gray-400'} group-hover/like:text-red-500 transition-colors`} 
                        size={18} 
                      />
                    </motion.div>
                    <span className="ml-1 text-sm text-gray-600">{photo.likes}</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* 照片详情弹窗 */}
      <Dialog
        open={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/90" aria-hidden="true" />
        
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-6xl transform rounded-2xl bg-black text-left align-middle shadow-xl transition-all">
              {selectedPhoto && (
                <div className="relative">
                  {/* 关闭按钮 - 调整位置到左上角 */}
                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className="absolute left-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white/75 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>

                  {/* 主要内容区域 */}
                  <div className="flex flex-col lg:flex-row">
                    {/* 左侧大图 */}
                    <div className="relative lg:w-3/4 aspect-[4/3]">
                      <Image
                        src={selectedPhoto.url}
                        alt={selectedPhoto.title}
                        fill
                        className="object-contain"
                        priority
                      />
                    </div>

                    {/* 右侧信息面板 */}
                    <div className="lg:w-1/4 bg-white dark:bg-gray-900 p-6 overflow-y-auto max-h-[calc(100vh-2rem)]">
                      {/* 标题和评分 */}
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-medium dark:text-white">{selectedPhoto.title}</h2>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <Star weight="fill" className="text-yellow-400" size={20} />
                            <span className="ml-1 text-lg dark:text-white">{selectedPhoto.star}</span>
                          </div>
                          <div className="flex items-center">
                            <Heart 
                              weight={clickedPhotos.has(selectedPhoto.id) ? "fill" : "regular"}
                              className={`${clickedPhotos.has(selectedPhoto.id) ? 'text-red-500' : 'text-gray-400'}`}
                              size={20} 
                            />
                            <span className="ml-1 text-lg dark:text-white">{selectedPhoto.likes}</span>
                          </div>
                        </div>
                      </div>

                      {/* 地图 - 优化缩放级别并延迟加载 */}
                      <div className="mb-6 rounded-lg overflow-hidden h-48">
                        {typeof window !== 'undefined' && selectedPhoto.coordinates && (
                          <AMapContainer
                            center={transformCoordinates(selectedPhoto.coordinates)}
                            zoom={MAP_CONFIG.DETAIL_ZOOM}
                            marker={true}
                            location={selectedPhoto.location}
                          />
                        )}
                        {typeof window !== 'undefined' && !selectedPhoto.coordinates && (
                          <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500">
                            <MapPin size={24} className="mr-2" />
                            <span>该照片没有位置信息</span>
                          </div>
                        )}
                      </div>

                      {/* 拍摄信息 */}
                      <div className="space-y-6">
                        {/* 基本信息 */}
                        <div className="space-y-3">
                          <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <MapPin weight="fill" size={18} className="mr-2" />
                            <span className="text-sm">{selectedPhoto.location}</span>
                          </div>
                          <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <Calendar weight="fill" size={18} className="mr-2" />
                            <span className="text-sm">{formatDate(selectedPhoto.date, 'full')}</span>
                          </div>
                          <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <Camera weight="fill" size={18} className="mr-2" />
                            <span className="text-sm">{selectedPhoto.cameraModel}</span>
                          </div>
                        </div>

                        {/* EXIF 信息 */}
                        {selectedPhoto.exif && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                              拍摄参数
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                                  <span>光圈</span>
                                  <span className="font-mono">ƒ/{selectedPhoto.exif.f_number}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                                  <span>快门速度</span>
                                  <span className="font-mono">{selectedPhoto.exif.exposure_time}s</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                                  <span>ISO</span>
                                  <span className="font-mono">{selectedPhoto.exif.iso}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                                  <span>焦距</span>
                                  <span className="font-mono">{selectedPhoto.exif.focal_length}mm</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 镜头信息 */}
                        {selectedPhoto.exif && selectedPhoto.exif.lens_model && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <Camera weight="fill" size={16} className="mr-2" />
                              <span className="text-sm">{selectedPhoto.exif.lens_model}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </div>
  );
} 