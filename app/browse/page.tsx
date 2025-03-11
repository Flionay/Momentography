'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Camera, MapPin, Calendar, Star } from '@phosphor-icons/react';
import { Dialog } from '@headlessui/react';
import { formatDate, parseExifDate } from '@/app/utils/dateFormat';

interface Photo {
  id: string;
  url: string;
  title: string;
  location: string;
  date: string;
  parsedDate: Date;
  cameraModel: string;
  star: number;
  exif: {
    [key: string]: string | number | null;
  };
}

export default function BrowsePage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'star'>('date');
  const [filterCamera, setFilterCamera] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [cameras, setCameras] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    async function loadPhotos() {
      try {
        const albumsResp = await fetch('/data/albums.json');
        const albumsData = await albumsResp.json();
        
        const exifResp = await fetch('/data/exif_data.json');
        const exifData = await exifResp.json();
        
        let processedPhotos = Object.entries(exifData)
          .map(([path, data]: [string, any]) => {
            const albumName = path.split('/')[0];
            const fileName = path.split('/')[1].split('.')[0];
            const album = albumsData[albumName];
            const photoUrl = album?.images.find((url: string) => url.includes(fileName));
            
            // 解析日期
            const dateObj = parseExifDate(data.DateTime);
            
            return {
              id: path,
              url: photoUrl || '',
              title: albumsData[albumName]?.title || '',
              location: data.Location || '',
              date: data.DateTime || '',
              parsedDate: dateObj, // 添加解析后的日期对象用于排序
              cameraModel: data.CameraModel || '',
              star: data.star || 0,
              exif: {
                FNumber: data.FNumber,
                ISO: data.ISO,
                FocalLength: data.FocalLength,
                ExposureTime: data.ExposureTime,
                LensModel: data.LensModel,
              }
            };
          })
          .filter(photo => photo.url !== '');

        // 提取所有相机型号和地点
        const uniqueCameras = [...new Set(processedPhotos.map(p => p.cameraModel))];
        const uniqueLocations = [...new Set(processedPhotos.map(p => p.location))];
        
        setCameras(uniqueCameras);
        setLocations(uniqueLocations);

        // 按日期排序（从新到旧）
        processedPhotos.sort((a, b) => {
          if (!a.parsedDate && !b.parsedDate) return 0;
          if (!a.parsedDate) return 1;
          if (!b.parsedDate) return -1;
          return b.parsedDate.getTime() - a.parsedDate.getTime();
        });

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
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return b.star - a.star;
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

  // 排序函数
  const sortPhotos = (sortType: string) => {
    const sortedPhotos = [...photos];
    
    switch (sortType) {
      case 'date':
        sortedPhotos.sort((a, b) => {
          if (!a.parsedDate && !b.parsedDate) return 0;
          if (!a.parsedDate) return 1;
          if (!b.parsedDate) return -1;
          return b.parsedDate.getTime() - a.parsedDate.getTime();
        });
        break;
      case 'rating':
        sortedPhotos.sort((a, b) => (b.star || 0) - (a.star || 0));
        break;
      // ... 其他排序方式 ...
    }
    
    setPhotos(sortedPhotos);
    setSortBy(sortType as 'date' | 'star');
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* 筛选器 */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <select
            value={sortBy}
            onChange={(e) => sortPhotos(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm"
          >
            <option value="date">按时间排序</option>
            <option value="star">按评分排序</option>
          </select>
          
          <select
            value={filterCamera}
            onChange={(e) => setFilterCamera(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm"
          >
            <option value="all">所有相机</option>
            {cameras.map(camera => (
              <option key={camera} value={camera}>{camera}</option>
            ))}
          </select>
          
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm"
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
                className="group cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                  <Image
                    src={photo.url}
                    alt={photo.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105 duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{photo.title}</h3>
                    <div className="flex items-center">
                      <Star weight="fill" className="text-yellow-400" size={16} />
                      <span className="ml-1 text-sm">{photo.star}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <MapPin size={14} className="mr-1" />
                    <span>{photo.location}</span>
                  </div>
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
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white rounded-2xl overflow-hidden">
            <div className="relative aspect-[4/3]">
              {selectedPhoto && (
                <Image
                  src={selectedPhoto.url}
                  alt={selectedPhoto.title}
                  fill
                  className="object-contain"
                />
              )}
            </div>
            
            {selectedPhoto && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">{selectedPhoto.title}</h2>
                  <div className="flex items-center">
                    <Star weight="fill" className="text-yellow-400" size={18} />
                    <span className="ml-1">{selectedPhoto.star}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-600">
                      <MapPin size={18} className="mr-2" />
                      <span>{selectedPhoto.location}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar size={18} className="mr-2" />
                      <span>{formatDate(selectedPhoto.date, 'full')}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Camera size={18} className="mr-2" />
                      <span>{selectedPhoto.cameraModel}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>光圈: f/{selectedPhoto.exif.FNumber}</p>
                    <p>ISO: {selectedPhoto.exif.ISO}</p>
                    <p>焦距: {selectedPhoto.exif.FocalLength}mm</p>
                    <p>快门速度: {selectedPhoto.exif.ExposureTime}s</p>
                    <p>镜头: {selectedPhoto.exif.LensModel}</p>
                  </div>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
} 