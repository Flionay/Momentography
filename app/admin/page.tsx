'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Star } from '@phosphor-icons/react';
import { formatDate } from '../utils/dateFormat';

interface Photo {
  id: string;
  url: string;
  title: string;
  location?: string;
  date?: string;
  star?: number;
  albumName?: string;
}

export default function AdminPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'starred' | 'unstarred'
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'star'

  useEffect(() => {
    async function loadPhotos() {
      try {
        // 加载所有照片数据
        const albumsResp = await fetch('/data/albums.json');
        const albumsData = await albumsResp.json();
        
        const exifResp = await fetch('/data/exif_data.json');
        const exifData = await exifResp.json();
        
        const processedPhotos = Object.entries(exifData)
          .map(([path, data]: [string, any]) => {
            const albumName = path.split('/')[0];
            const fileName = path.split('/')[1].split('.')[0];
            const album = albumsData[albumName];
            const photoUrl = album?.images.find((url: string) => url.includes(fileName));
            
            return {
              id: path,
              url: photoUrl || '',
              title: albumsData[albumName]?.title || '',
              location: data.Location,
              date: data.DateTime,
              star: data.star || 0,
              albumName
            };
          })
          .filter(photo => photo.url !== '');
          
        setPhotos(processedPhotos);
      } catch (error) {
        console.error('加载照片时出错:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPhotos();
  }, []);

  const handleStarUpdate = async (photoId: string, newStars: number) => {
    try {
      const response = await fetch('/api/photos/star', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoPath: photoId,
          stars: newStars,
        }),
      });

      if (response.ok) {
        setPhotos(photos.map(photo => 
          photo.id === photoId ? { ...photo, star: newStars } : photo
        ));
      }
    } catch (error) {
      console.error('更新星级失败:', error);
    }
  };

  const filteredPhotos = photos.filter(photo => {
    if (filter === 'starred') return photo.star && photo.star > 0;
    if (filter === 'unstarred') return !photo.star || photo.star === 0;
    return true;
  });

  const sortedPhotos = [...filteredPhotos].sort((a, b) => {
    if (sortBy === 'star') {
      return (b.star || 0) - (a.star || 0);
    }
    // 默认按日期排序
    return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4 dark:text-white">照片管理</h1>
          
          {/* 过滤和排序控制 */}
          <div className="flex gap-4 mb-6">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">全部照片</option>
              <option value="starred">已打星</option>
              <option value="unstarred">未打星</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="date">按日期排序</option>
              <option value="star">按星级排序</option>
            </select>
          </div>
          
          {/* 统计信息 */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            共 {photos.length} 张照片，
            已打星 {photos.filter(p => p.star && p.star > 0).length} 张
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedPhotos.map((photo) => (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={photo.url}
                    alt={photo.title}
                    fill
                    className="object-cover"
                  />
                  {/* 星级评分 */}
                  <div className="absolute top-2 right-2 flex gap-1 bg-black/20 rounded-full backdrop-blur-sm p-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => handleStarUpdate(photo.id, n)}
                        className="p-1"
                      >
                        <Star
                          size={20}
                          weight={n <= (photo.star || 0) ? "fill" : "regular"}
                          className={`${
                            n <= (photo.star || 0) ? 'text-yellow-400' : 'text-white'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium mb-1 dark:text-white">{photo.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{photo.location}</p>
                  {photo.date && (
                    <p className="text-sm text-gray-500">
                      {formatDate(photo.date, 'full')}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 