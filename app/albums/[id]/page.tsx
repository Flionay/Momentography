'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Dialog } from '@headlessui/react';
import { MapPin, Calendar, Camera, X } from '@phosphor-icons/react';
import AMapContainer from '@/app/components/AMapContainer';
import { formatDate } from '@/app/utils/dateFormat';

interface Photo {
  id: string;
  url: string;
  exif: {
    CameraModel?: string;
    LensModel?: string;
    ExposureTime?: string;
    FNumber?: string;
    ISO?: string;
    FocalLength?: string;
    DateTime?: string;
    Location?: string;
    Latitude?: number;
    Longitude?: number;
  };
}

interface Album {
  id: string;
  title: string;
  desc: string;
  date: string;
  location: string;
  coordinates: [number, number];
  images: string[];
}

export default function AlbumPage() {
  const params = useParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAlbum() {
      try {
        setIsLoading(true);
        
        // 获取相册数据
        const albumsResp = await fetch('/data/albums.json');
        if (!albumsResp.ok) throw new Error('无法加载相册数据');
        const albumsData = await albumsResp.json();
        
        // 处理URL编码的ID
        let albumId = Array.isArray(params.id) ? params.id[0] : params.id;
        
        // 尝试URL解码
        try {
          albumId = decodeURIComponent(albumId);
        } catch (e) {
          console.error('解码相册ID失败:', e);
        }
        
        console.log('解码后的相册ID:', albumId);
        console.log('可用相册:', Object.keys(albumsData));
        
        // 检查相册是否存在
        if (!albumsData[albumId]) {
          console.error(`相册 ${albumId} 不存在`, Object.keys(albumsData));
          setError(`相册 "${albumId}" 不存在`);
          setIsLoading(false);
          return;
        }
        
        // 解析坐标
        const locationStr = albumsData[albumId].location || '';
        const coordinates = locationStr.split(',').map(coord => parseFloat(coord.trim())) as [number, number];
        
        // 设置相册数据
        const albumWithId: Album = {
          id: albumId as string,
          title: albumsData[albumId].title,
          desc: albumsData[albumId].desc,
          date: albumsData[albumId].date,
          location: albumsData[albumId].location,
          coordinates: coordinates.length === 2 && !isNaN(coordinates[0]) && !isNaN(coordinates[1]) 
            ? coordinates 
            : [0, 0],
          images: albumsData[albumId].images || []
        };
        
        setAlbum(albumWithId);
        
        // 获取EXIF数据
        const exifResp = await fetch('/data/exif_data.json');
        if (!exifResp.ok) throw new Error('无法加载EXIF数据');
        const exifData = await exifResp.json();
        
        // 处理照片数据
        const processedPhotos = albumWithId.images.map((url, index) => {
          // 从URL中提取文件名
          const urlParts = url.split('/');
          const fileName = urlParts[urlParts.length - 1].split('.')[0];
          
          // 尝试找到匹配的EXIF数据
          const exifKey = Object.keys(exifData).find(key => {
            // 检查是否包含相册名和文件名
            return key.startsWith(`${albumId}/`) && key.includes(fileName);
          });
          
          const exif = exifKey ? exifData[exifKey] : {};
          
          return {
            id: `${albumId}_${index}`,
            url,
            exif
          };
        });
        
        setPhotos(processedPhotos);
      } catch (error) {
        console.error('加载相册数据时出错:', error);
        setError('加载相册数据时出错');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (params.id) {
      loadAlbum();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">出错了</h1>
        <p className="text-gray-600 mb-8">{error || '无法加载相册'}</p>
        <p className="text-gray-600">相册ID: {params.id}</p>
        <p className="text-gray-600 mt-4">可用相册: {album ? '有' : '无'}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* 相册标题和描述 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <h1 className="text-4xl font-bold mb-4">{album.title}</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">{album.desc}</p>
        
        <div className="flex items-center justify-center space-x-6 mt-4 text-sm text-gray-600">
          <div className="flex items-center">
            <MapPin size={18} className="mr-2" />
            <span>{album.location}</span>
          </div>
          <div className="flex items-center">
            <Calendar size={18} className="mr-2" />
            <span>{album.date}</span>
          </div>
        </div>
      </motion.div>
      
      {/* 照片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="cursor-pointer"
            onClick={() => setSelectedPhoto(photo)}
          >
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
              <Image
                src={photo.url}
                alt={`${album.title} - 照片 ${index + 1}`}
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* 照片详情弹窗 */}
      <Dialog
        open={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
            <div className="relative">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-900">
                {selectedPhoto && (
                  <Image
                    src={selectedPhoto.url}
                    alt="照片详情"
                    fill
                    className="object-contain"
                  />
                )}
              </div>
              
              {selectedPhoto && (
                <div className="p-6">
                  {/* 地图容器 */}
                  {selectedPhoto.exif.Latitude && selectedPhoto.exif.Longitude && (
                    <div className="h-[200px] mb-4 rounded-lg overflow-hidden">
                      <AMapContainer
                        center={[selectedPhoto.exif.Latitude, selectedPhoto.exif.Longitude]}
                        zoom={15}
                        marker={true}
                        location={selectedPhoto.exif.Location || album.title}
                      />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-gray-600">
                        <MapPin size={18} className="mr-2" />
                        <span>{selectedPhoto.exif.Location || album.location || '未知地点'}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar size={18} className="mr-2" />
                        <span>{formatDate(selectedPhoto.exif.DateTime, 'full') || album.date}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Camera size={18} className="mr-2" />
                        <span>{selectedPhoto.exif.CameraModel || '未知相机'}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      {selectedPhoto.exif.FNumber && <p>光圈: f/{selectedPhoto.exif.FNumber}</p>}
                      {selectedPhoto.exif.ISO && <p>ISO: {selectedPhoto.exif.ISO}</p>}
                      {selectedPhoto.exif.FocalLength && <p>焦距: {selectedPhoto.exif.FocalLength}mm</p>}
                      {selectedPhoto.exif.ExposureTime && <p>快门速度: {selectedPhoto.exif.ExposureTime}s</p>}
                      {selectedPhoto.exif.LensModel && <p>镜头: {selectedPhoto.exif.LensModel}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}