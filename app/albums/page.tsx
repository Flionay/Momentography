'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Calendar } from '@phosphor-icons/react';

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
                className="group cursor-pointer"
              >
                <Link href={`/albums/${album.id}`}>
                  <div className="relative aspect-[3/2] overflow-hidden rounded-xl">
                    <Image
                      src={album.images[0]}
                      alt={album.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105 duration-700"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-6 group-hover:translate-y-0 transition-transform duration-300">
                      <h2 className="text-xl font-bold mb-2">{album.title}</h2>
                      <p className="text-sm text-white/90 line-clamp-2">
                        {album.desc}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin size={16} className="mr-1" />
                      <span>{album.location}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={16} className="mr-1" />
                      <span>{album.date}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {album.images.length} 张照片
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