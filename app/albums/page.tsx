'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Images, ArrowRight } from '@phosphor-icons/react';

interface Album {
  title: string;
  location: string;
  date: string;
  desc: string;
  images: string[];
}

interface AlbumWithId extends Album {
  id: string;
  parsedDate?: Date;
}

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<AlbumWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAlbums() {
      try {
        const response = await fetch('/data/albums.json');
        const data = await response.json();
        
        const processedAlbums = Object.entries(data).map(([id, album]: [string, any]) => {
          // 解析日期以便排序
          const dateParts = album.date.split('/');
          let parsedDate: Date | undefined;
          
          if (dateParts.length === 3) {
            // 假设格式为 DD/MM/YYYY
            parsedDate = new Date(
              parseInt(dateParts[2]), // 年
              parseInt(dateParts[1]) - 1, // 月（0-11）
              parseInt(dateParts[0]) // 日
            );
          }
          
          return {
            id,
            ...album,
            parsedDate
          };
        });
        
        // 按日期排序（从新到旧）
        processedAlbums.sort((a, b) => {
          if (!a.parsedDate && !b.parsedDate) return 0;
          if (!a.parsedDate) return 1;
          if (!b.parsedDate) return -1;
          return b.parsedDate.getTime() - a.parsedDate.getTime();
        });
        
        setAlbums(processedAlbums);
      } catch (error) {
        console.error('加载相册时出错:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAlbums();
  }, []);

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

  return (
    <div className="min-h-screen py-12 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">我的相册集</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            按照不同的旅行和主题整理的照片集，记录下每一段精彩的故事
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {albums.map((album) => (
              <motion.div
                key={album.id}
                variants={itemVariants}
                className="group"
              >
                <Link href={`/albums/${album.id}`} className="block">
                  <div className="relative mb-6">
                    {/* 相册封面 */}
                    <div className="album-cover relative aspect-[4/3] rounded-lg shadow-lg overflow-hidden transform transition-all duration-500 group-hover:shadow-xl border-8 border-white dark:border-gray-800">
                      <Image
                        src={album.images[0]}
                        alt={album.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      
                      {/* 相册标题覆盖在主图上 */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h2 className="text-2xl font-bold mb-1 drop-shadow-md">{album.title}</h2>
                        <div className="flex items-center text-sm text-white/90 mb-2">
                          <MapPin weight="fill" size={14} className="mr-1" />
                          <span>{album.location}</span>
                          <span className="mx-2">•</span>
                          <Calendar weight="fill" size={14} className="mr-1" />
                          <span>{album.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 相册描述和信息 */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md transform transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-lg">
                    <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
                      {album.desc}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Images weight="fill" size={16} className="mr-1" />
                        <span>{album.images.length} 张照片</span>
                      </div>
                      <div className="text-indigo-600 dark:text-indigo-400 flex items-center font-medium text-sm">
                        <span>查看相册</span>
                        <ArrowRight weight="bold" size={16} className="ml-1 transform transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
} 