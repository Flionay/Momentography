'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Calendar, ArrowRight } from '@phosphor-icons/react';

interface Album {
  title: string;
  location: string;
  date: string;
  desc: string;
  images: string[];
}

interface AlbumWithId extends Album {
  id: string;
}

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<AlbumWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAlbums() {
      try {
        const response = await fetch('/data/albums.json');
        const data = await response.json();
        
        const processedAlbums = Object.entries(data).map(([id, album]: [string, any]) => ({
          id,
          ...album,
        }));
        
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
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">我的相册集</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            按照不同的旅行和主题整理的照片集，记录下每一段精彩的故事
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
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
                  <div className="relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 group-hover:shadow-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <Image
                        src={album.images[0]}
                        alt={album.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-70" />
                    </div>
                    
                    <div className="p-6">
                      <h2 className="text-xl font-bold mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{album.title}</h2>
                      
                      <div className="flex items-center space-x-4 mb-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                          <MapPin weight="fill" size={14} className="mr-1 text-indigo-500" />
                          <span>{album.location}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar weight="fill" size={14} className="mr-1 text-indigo-500" />
                          <span>{album.date}</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-3">{album.desc}</p>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                          {album.images.length} 张照片
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium group-hover:translate-x-1 transition-transform duration-300 flex items-center">
                          查看相册 <ArrowRight size={16} className="ml-1" />
                        </span>
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