'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog } from '@headlessui/react';
import { Camera, Calendar, X, MapPin, List, ArrowLeft, ArrowRight, MagnifyingGlassPlus } from '@phosphor-icons/react';
import 'leaflet/dist/leaflet.css';
import { MAP_CONFIG } from '@/app/config/map';

// 动态导入地图组件以避免 SSR 问题
const Map = dynamic(
  async () => {
    const { MapContainer } = await import('react-leaflet');
    // 在这里设置默认图标
    const L = await import('leaflet');
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: '/images/marker-icon.png',
      iconRetinaUrl: '/images/marker-icon-2x.png',
      shadowUrl: '/images/marker-shadow.png',
    });
    return MapContainer;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
      </div>
    )
  }
);

// 其他动态导入保持不变
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);

const Circle = dynamic(
  () => import('react-leaflet').then(mod => mod.Circle),
  { ssr: false }
);

interface Photo {
  id: string;
  url: string;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  date: string;
  cameraModel: string;
  exif: {
    [key: string]: string | number | null;
  };
}

// 自定义地图控制组件
const MapController = ({ onCircleSelect }: { onCircleSelect: (center: [number, number], radius: number) => void }) => {
  // 在组件内部导入 useMap hook
  const { useMap } = require('react-leaflet');
  const map = useMap();
  const [isCircleMode, setIsCircleMode] = useState(false);
  const [circleCenter, setCircleCenter] = useState<[number, number] | null>(null);
  const [circleRadius, setCircleRadius] = useState(50000); // 默认半径50公里
  const circleRef = useRef<any>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!map) return;

    const handleMouseMove = (e: any) => {
      if (isCircleMode) {
        setCircleCenter([e.latlng.lat, e.latlng.lng]);
      }
    };

    const handleClick = (e: any) => {
      // 检查点击是否发生在滑块容器内
      if (sliderContainerRef.current && sliderContainerRef.current.contains(e.originalEvent.target)) {
        return; // 如果点击在滑块容器内，不触发圆形选择
      }
      
      if (isCircleMode) {
        onCircleSelect([e.latlng.lat, e.latlng.lng], circleRadius);
      }
    };

    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);

    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('click', handleClick);
    };
  }, [map, isCircleMode, circleRadius, onCircleSelect]);

  // 阻止滑块上的事件冒泡到地图
  const handleSliderContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 阻止滑块拖动事件冒泡到地图
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 临时禁用地图拖动
    if (map) {
      map.dragging.disable();
      
      // 添加全局事件监听器，在鼠标释放时重新启用地图拖动
      const enableDragging = () => {
        map.dragging.enable();
        document.removeEventListener('mouseup', enableDragging);
        document.removeEventListener('mouseleave', enableDragging);
      };
      
      document.addEventListener('mouseup', enableDragging);
      document.addEventListener('mouseleave', enableDragging);
    }
  };

  return (
    <>
      {/* 控制面板 - 移到底部中央并与提示信息整合 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/95 dark:bg-gray-800/95 p-3 rounded-lg shadow-lg z-[1000] backdrop-blur-sm">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <button 
              className={`flex items-center px-3 py-1.5 rounded-md transition-colors ${isCircleMode ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              onClick={() => setIsCircleMode(!isCircleMode)}
            >
              <MagnifyingGlassPlus size={16} className="mr-1.5" />
              <span className="text-sm font-medium">{isCircleMode ? "退出区域选择" : "区域选择"}</span>
            </button>
            
            {!isCircleMode && (
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-3">
                点击标记查看照片，或使用区域选择工具
              </span>
            )}
          </div>
          
          {isCircleMode && (
            <div 
              ref={sliderContainerRef}
              onClick={handleSliderContainerClick}
              className="mt-2"
            >
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  选择区域半径: <span className="font-bold">{circleRadius / 1000} km</span>
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  移动鼠标选择中心点，点击地图确认
                </span>
              </div>
              <div 
                className="relative" 
                onMouseDown={handleSliderMouseDown}
              >
                <input 
                  type="range" 
                  min="5" 
                  max="200" 
                  step="5"
                  value={circleRadius / 1000}
                  onChange={(e) => setCircleRadius(parseInt(e.target.value) * 1000)}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>5km</span>
                  <span>100km</span>
                  <span>200km</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isCircleMode && circleCenter && (
        <Circle 
          ref={circleRef}
          center={circleCenter}
          radius={circleRadius}
          pathOptions={{ 
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2
          }}
        />
      )}
    </>
  );
};

// 动态导入 MapController 组件，确保只在客户端渲染
const DynamicMapController = dynamic(
  () => Promise.resolve(MapController),
  { ssr: false }
);

// 画廊组件
const Gallery = ({ photos, onClose }: { photos: Photo[], onClose: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isFullView, setIsFullView] = useState(false);

  const nextPhoto = () => {
    if (currentIndex === null && photos.length > 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((prev) => (prev !== null ? (prev + 1) % photos.length : 0));
  };

  const prevPhoto = () => {
    if (currentIndex === null && photos.length > 0) {
      setCurrentIndex(photos.length - 1);
      return;
    }
    setCurrentIndex((prev) => (prev !== null ? (prev - 1 + photos.length) % photos.length : photos.length - 1));
  };

  // 获取当前照片，如果没有选择则使用第一张
  const currentPhoto = currentIndex !== null ? photos[currentIndex] : (photos.length > 0 ? photos[0] : null);

  // 进入全屏视图时，如果没有选择照片，则默认选择第一张
  const handleEnterFullView = (index: number) => {
    setCurrentIndex(index);
    setIsFullView(true);
  };

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-500">
        <MapPin size={32} className="mb-2" />
        <p>该区域内没有照片</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          区域内的照片 ({photos.length})
        </h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => {
              if (!isFullView && currentIndex === null && photos.length > 0) {
                setCurrentIndex(0);
              }
              setIsFullView(!isFullView);
            }}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={isFullView ? "缩略图视图" : "全屏视图"}
          >
            <List size={18} />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {isFullView && currentPhoto ? (
        <div className="flex-grow flex flex-col">
          <div className="relative flex-grow bg-gray-100 dark:bg-gray-900 rounded-lg">
            <Image
              src={currentPhoto.url}
              alt={currentPhoto.title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 400px"
            />
            
            <button 
              onClick={prevPhoto}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 transition-colors"
              disabled={photos.length <= 1}
            >
              <ArrowLeft size={20} />
            </button>
            
            <button 
              onClick={nextPhoto}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 transition-colors"
              disabled={photos.length <= 1}
            >
              <ArrowRight size={20} />
            </button>
            
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 px-2 py-1 rounded-full text-white text-xs">
              {currentIndex !== null ? currentIndex + 1 : 1} / {photos.length}
            </div>
          </div>
          
          <div className="mt-4 text-sm">
            <h3 className="font-medium">{currentPhoto.title}</h3>
            <div className="flex items-center mt-1 text-gray-600 dark:text-gray-400">
              <MapPin size={14} className="mr-1" />
              <span>{currentPhoto.location}</span>
            </div>
            <div className="flex items-center mt-1 text-gray-600 dark:text-gray-400">
              <Calendar size={14} className="mr-1" />
              <span>{currentPhoto.date}</span>
            </div>
            <button 
              onClick={() => window.open(`/albums/${currentPhoto.id.split('/')[0]}`, '_blank')}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              查看相册
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-grow pb-2">
          {photos.map((photo, index) => (
            <div 
              key={photo.id} 
              className="cursor-pointer transition-all duration-200 hover:opacity-90"
              onClick={() => handleEnterFullView(index)}
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
                <Image
                  src={photo.url}
                  alt={photo.title}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 50vw, 150px"
                />
              </div>
              <p className="text-xs mt-1 truncate">{photo.location}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function MapPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [circlePhotos, setCirclePhotos] = useState<Photo[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<{center: [number, number], radius: number} | null>(null);

  useEffect(() => {
    async function loadPhotos() {
      try {
        // 使用新的API路由获取地图数据
        const response = await fetch('/api/data/map');
        if (!response.ok) {
          throw new Error(`获取地图数据失败: ${response.status} ${response.statusText}`);
        }
        
        const mapData = await response.json();
        console.log(`获取到 ${mapData.length} 张带地理位置的照片`);
        
        // 直接使用API返回的数据
        setPhotos(mapData);
      } catch (error) {
        console.error('加载照片数据时出错:', error);
      } finally {
        setIsLoading(false);
        setIsLoaded(true);
      }
    }

    loadPhotos();
  }, []);

  // 处理圆形区域选择
  const handleCircleSelect = (center: [number, number], radius: number) => {
    setSelectedCircle({ center, radius });
    
    // 计算圆形区域内的照片
    const photosInCircle = photos.filter(photo => {
      const distance = calculateDistance(
        center[0], center[1],
        photo.latitude, photo.longitude
      );
      return distance <= radius / 1000; // 转换为公里
    });
    
    setCirclePhotos(photosInCircle);
    setDrawerOpen(true);
  };

  // 计算两点之间的距离（公里）
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <div className="min-h-screen relative">
      {isLoaded ? (
        <div className="h-[calc(100vh-4rem)] relative">
          <Map
            center={MAP_CONFIG.CHINA_CENTER}
            zoom={MAP_CONFIG.DEFAULT_ZOOM}
            className="h-full w-full z-0"
            scrollWheelZoom={true}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
            />
            {photos.map((photo) => (
              <Marker
                key={photo.id}
                position={[photo.latitude, photo.longitude]}
              >
                <Popup>
                  <div className="p-2 max-w-xs">
                    <div className="relative aspect-[4/3] w-full mb-2 rounded-lg overflow-hidden">
                      <Image
                        src={photo.url}
                        alt={photo.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 300px"
                      />
                    </div>
                    <h3 className="font-medium text-sm">{photo.title}</h3>
                    <div className="flex items-center mt-1 text-xs text-gray-600">
                      <MapPin size={12} className="mr-1" />
                      <span className="truncate">{photo.location}</span>
                    </div>
                    <div className="flex items-center mt-1 text-xs text-gray-600">
                      <Calendar size={12} className="mr-1" />
                      <span>{photo.date}</span>
                    </div>
                    <button 
                      onClick={() => window.open(`/albums/${photo.id.split('/')[0]}`, '_blank')}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                      查看相册
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
            
            <DynamicMapController onCircleSelect={handleCircleSelect} />
          </Map>
          
          {/* 悬浮式抽屉画廊 - 移到左侧 */}
          <AnimatePresence>
            {drawerOpen && (
              <motion.div 
                className="absolute top-4 left-4 h-[calc(100%-2rem)] w-80 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] z-10 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700"
                initial={{ x: -320, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -320, opacity: 0 }}
                transition={{ 
                  type: 'spring', 
                  damping: 25, 
                  stiffness: 250,
                  mass: 0.8
                }}
              >
                <div className="p-4 h-full">
                  <Gallery 
                    photos={circlePhotos} 
                    onClose={() => setDrawerOpen(false)} 
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
} 