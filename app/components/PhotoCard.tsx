'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

interface PhotoCardProps {
  photo: {
    id: string;
    url: string;
    title?: string;
    star?: number;
    location?: string;
  };
  isAdmin?: boolean;
  onStarUpdate?: (newStars: number) => void;
}

export default function PhotoCard({ photo, isAdmin, onStarUpdate }: PhotoCardProps) {
  const [stars, setStars] = useState(photo.star || 0);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStarClick = async (newStars: number) => {
    if (!isAdmin || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch('/api/photos/star', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoPath: photo.id,
          stars: newStars,
        }),
      });

      if (response.ok) {
        setStars(newStars);
        onStarUpdate?.(newStars);
      }
    } catch (error) {
      console.error('更新星级失败:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative group">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
        <Image
          src={photo.url}
          alt={photo.title || ""}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="font-medium text-lg">{photo.title}</h3>
          <p className="text-sm text-white/90">{photo.location}</p>
        </div>
        {isAdmin && (
          <div className="absolute top-2 right-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <motion.button
                key={n}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleStarClick(n)}
                className={`p-1 rounded-full ${
                  isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isUpdating}
              >
                <Star
                  size={24}
                  weight={n <= stars ? "fill" : "regular"}
                  className={`${
                    n <= stars ? 'text-yellow-400' : 'text-white'
                  } drop-shadow-lg`}
                />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 