'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Calendar, ArrowLeft, Camera } from  '@phosphor-icons/react';
import { Dialog } from '@headlessui/react';

interface Photo {
  url: string;
  exif: {
    Location: string;
    DateTime: string;
    CameraModel: string;
    FNumber: string | number;
    ISO: string | number;
    FocalLength: string | number;
    ExposureTime: string | number;
    LensModel: string;
  };
}

interface Album {
  title: string;
  location: string;
  date: string;
  desc: string;
  images: string[];
}

export default function AlbumPage() {
  const { id } = useParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAlbum() {
      try {
        // 加载相册数据
        const albumsResp = await fetch('/data/albums.json');
        const albumsData = await albumsResp.json();
        const currentAlbum = albumsData[id as string];
        
        if (!currentAlbum) {
          throw new Error('相册不存在');
        }
        
        setAlbum(currentAlbum);
        
        // 加载 EXIF 数据
        const exifResp = await fetch('/data/exif_data.json');
        const exifData = await exifResp.json();
        
        // 处理照片数据
        const processedPhotos = currentAlbum.images.map((url: string) => {
          const fileName = url.split('/').pop()?.split('.')[0] ?? '';
          const exif = Object.entries(exifData).find(([path]) => path.includes(fileName));
          
          return {
            url,
            exif: exif ? exif[1] : {}
          };
        });
        
        setPhotos(processedPhotos);
      } catch (error) {
        console.error('加载相册数据时出错:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      loadAlbum();
    }
  }, [id]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">相册不存在</h1>
          <Link
            href="/albums"
            className="text-gray-600 hover:text-black flex items-center"
          >
            <ArrowLeft size={20} className="mr-2" />
            返回相册列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* 返回按钮 */}
        <div className="mb-8">
          <Link
            href="/albums"
            className="inline-flex items-center text-gray-600 hover:text-black"
          >
            <ArrowLeft size={20} className="mr-2" />
            返回相册列表
          </Link>
        </div>

        {/* 相册信息 */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-4">{album.title}</h1>
          <div className="flex flex-wrap gap-4 text-gray-600 mb-4">
            <div className="flex items-center">
              <MapPin size={18} className="mr-2" />
              <span>{album.location}</span>
            </div>
            <div className="flex items-center">
              <Calendar size={18} className="mr-2" />
              <span>{album.date}</span>
            </div>
          </div>
          <p className="text-gray-600 max-w-3xl">
            {album.desc}
          </p>
        </div>

        {/* 照片网格 */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {photos.map((photo, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                <Image
                  src={photo.url}
                  alt={`照片 ${index + 1}`}
                  fill
                  className="object-cover transition-transform group-hover:scale-105 duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              </div>
            </motion.div>
          ))}
        </motion.div>
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
                  alt="照片详情"
                  fill
                  className="object-contain"
                />
              )}
            </div>
            
            {selectedPhoto && selectedPhoto.exif && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-600">
                      <MapPin size={18} className="mr-2" />
                      <span>{selectedPhoto.exif.Location || '未知地点'}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar size={18} className="mr-2" />
                      <span>{selectedPhoto.exif.DateTime || '未知时间'}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Camera size={18} className="mr-2" />
                      <span>{selectedPhoto.exif.CameraModel || '未知相机'}</span>
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