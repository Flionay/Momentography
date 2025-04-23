'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Dialog } from '@headlessui/react';
import { 
  Camera, 
  MapPin, 
  Calendar, 
  X, 
  Star, 
  PencilSimple,
  CheckCircle,
  XCircle
} from '@phosphor-icons/react';
import ExifEditor from './ExifEditor';

interface Photo {
  id: string;
  url: string;
  title?: string;
  location?: string;
  date?: string;
  star?: number;
  album_id?: string;
  album_title?: string;
  exif?: {
    camera_model?: string | null;
    lens_model?: string | null;
    f_number?: number | null;
    exposure_time?: string | null;
    iso?: number | null;
    focal_length?: string | null;
    location?: string | null;
    date_time?: string | null;
    raw_data?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    raw?: any;
  };
}

interface PhotoDetailProps {
  photo: Photo;
  isOpen: boolean;
  onClose: () => void;
  onStarUpdate?: (photoId: string, newStars: number) => Promise<void>;
  onRefresh?: () => void;
}

export default function PhotoDetail({ photo, isOpen, onClose, onStarUpdate, onRefresh }: PhotoDetailProps) {
  const [stars, setStars] = useState(photo.star || 0);
  const [isUpdatingStar, setIsUpdatingStar] = useState(false);
  const [showExifEditor, setShowExifEditor] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleStarClick = async (newStars: number) => {
    if (isUpdatingStar || !onStarUpdate) return;
    
    setIsUpdatingStar(true);
    try {
      await onStarUpdate(photo.id, newStars);
      setStars(newStars);
      setUpdateStatus('success');
      setTimeout(() => setUpdateStatus('idle'), 2000);
    } finally {
      setIsUpdatingStar(false);
    }
  };

  const handleSaveExif = async (data: any) => {
    try {
      const response = await fetch('/api/photos/update-exif', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('更新EXIF数据失败');
      }
      
      // 如果有刷新函数，调用它来刷新数据
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      throw error;
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        className="relative z-[50]"
      >
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-6xl bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden">
            <div className="relative">
              <button
                onClick={onClose}
                className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="flex flex-col lg:flex-row">
                {/* 左侧大图 */}
                <div className="relative lg:w-3/4 aspect-[4/3]">
                  <Image
                    src={photo.url}
                    alt={photo.title || "照片"}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>

                {/* 右侧信息面板 */}
                <div className="lg:w-1/4 bg-white dark:bg-gray-900 p-6 overflow-y-auto max-h-[calc(100vh-2rem)]">
                  {/* 标题和位置 */}
                  <div className="mb-6">
                    <div className="flex justify-between items-start">
                      <h2 className="text-xl font-medium dark:text-white mb-2">{photo.title || photo.album_title || "未命名照片"}</h2>
                      
                      {onStarUpdate && (
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <motion.button
                              key={n}
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleStarClick(n)}
                              className={`p-1 ${isUpdatingStar ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={isUpdatingStar}
                            >
                              <Star
                                size={20}
                                weight={n <= stars ? "fill" : "regular"}
                                className={`${n <= stars ? 'text-yellow-400' : 'text-gray-400'}`}
                              />
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {updateStatus === 'success' && (
                      <div className="mt-2 p-2 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-md text-sm flex items-center">
                        <CheckCircle size={16} weight="fill" className="mr-2" />
                        星级已更新
                      </div>
                    )}
                    
                    {updateStatus === 'error' && (
                      <div className="mt-2 p-2 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-md text-sm flex items-center">
                        <XCircle size={16} weight="fill" className="mr-2" />
                        更新星级失败
                      </div>
                    )}
                    
                    {photo.location && (
                      <div className="flex items-center text-gray-600 dark:text-gray-300">
                        <MapPin weight="fill" size={18} className="mr-2" />
                        <span className="text-sm">{photo.location}</span>
                      </div>
                    )}
                    
                    {photo.date && (
                      <div className="flex items-center text-gray-600 dark:text-gray-300 mt-1">
                        <Calendar weight="fill" size={18} className="mr-2" />
                        <span className="text-sm">{photo.date}</span>
                      </div>
                    )}
                  </div>

                  {/* EXIF数据 */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        EXIF数据
                      </h3>
                      <button
                        onClick={() => setShowExifEditor(!showExifEditor)}
                        className={`text-sm px-3 py-1 rounded-lg flex items-center ${
                          showExifEditor
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <PencilSimple size={16} className="mr-1" />
                        {showExifEditor ? '取消编辑' : '编辑'}
                      </button>
                    </div>
                    
                    {showExifEditor ? (
                      <div className="mt-4">
                        <ExifEditor
                          photoId={photo.id}
                          exifData={photo.exif || {}}
                          onClose={() => setShowExifEditor(false)}
                          onSave={async (updatedData) => {
                            try {
                              const response = await fetch('/api/photos/update-exif', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(updatedData),
                              });
                              
                              if (!response.ok) {
                                throw new Error('更新EXIF数据失败');
                              }
                              
                              // 更新成功后关闭编辑器并刷新数据
                              setShowExifEditor(false);
                              if (onRefresh) {
                                await onRefresh();
                              }
                            } catch (error) {
                              throw error;
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* 相机和镜头信息 */}
                        <div className="space-y-2">
                          {photo.exif?.camera_model && (
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <Camera weight="fill" size={16} className="mr-2" />
                              <span className="text-sm">{photo.exif.camera_model}</span>
                            </div>
                          )}
                          
                          {photo.exif?.lens_model && (
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <span className="text-sm ml-6">{photo.exif.lens_model}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* 拍摄参数 */}
                        {(photo.exif?.f_number || photo.exif?.iso || photo.exif?.focal_length || photo.exif?.exposure_time) && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              {photo.exif?.f_number && (
                                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                                  <span>光圈</span>
                                  <span className="font-mono">ƒ/{photo.exif.f_number}</span>
                                </div>
                              )}
                              
                              {photo.exif?.exposure_time && (
                                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                                  <span>快门速度</span>
                                  <span className="font-mono">{photo.exif.exposure_time}s</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              {photo.exif?.iso && (
                                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                                  <span>ISO</span>
                                  <span className="font-mono">{photo.exif.iso}</span>
                                </div>
                              )}
                              
                              {photo.exif?.focal_length && (
                                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                                  <span>焦距</span>
                                  <span className="font-mono">{photo.exif.focal_length}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* 位置和时间 */}
                        <div className="space-y-2">
                          {photo.exif?.location && (
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <MapPin weight="fill" size={16} className="mr-2" />
                              <span className="text-sm">{photo.exif.location}</span>
                            </div>
                          )}
                          
                          {(photo.exif?.latitude || photo.exif?.longitude) && (
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <MapPin weight="fill" size={16} className="mr-2" />
                              <span className="text-sm">
                                {photo.exif.latitude?.toFixed(6)}, {photo.exif.longitude?.toFixed(6)}
                              </span>
                            </div>
                          )}
                          
                          {photo.exif?.date_time && (
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <Calendar weight="fill" size={16} className="mr-2" />
                              <span className="text-sm">{photo.exif.date_time}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 相册信息 */}
                  {photo.album_title && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        相册
                      </h3>
                      <div className="text-gray-600 dark:text-gray-300 text-sm">
                        {photo.album_title}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
} 