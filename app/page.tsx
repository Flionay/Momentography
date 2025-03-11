'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Camera, GlobeHemisphereEast, Image as ImageIcon } from '@phosphor-icons/react';
import { formatDate, parseExifDate } from '@/app/utils/dateFormat';

// 导入类型
interface Photo {
  url: string;
  title?: string;
  location?: string;
  cameraModel?: string;
  date?: string;
  parsedDate?: Date | null;
  star?: number;
  city?: string;
  albumName?: string;
  rawLocation?: string;
  province?: string;
}

export default function Home() {
  const [featuredPhotos, setFeaturedPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadFeaturedPhotos() {
      try {
        const albumsResp = await fetch('/data/albums.json');
        const albumsData = await albumsResp.json();
        
        const exifResp = await fetch('/data/exif_data.json');
        const exifData = await exifResp.json();

        // 调试：打印原始数据数量
        console.log('原始EXIF数据条数:', Object.keys(exifData).length);
        
        // 1. 处理所有照片数据，更细致地处理位置信息
        const allPhotos = Object.entries(exifData)
          .map(([path, data]: [string, any]) => {
            const albumName = path.split('/')[0];
            const fileName = path.split('/')[1].split('.')[0];
            const album = albumsData[albumName];
            const photoUrl = album?.images.find((url: string) => url.includes(fileName));
            const parsedDate = parseExifDate(data.DateTime);

            // 提取省份名称
            let province = '';
            if (data.Location) {
              const locationParts = data.Location.split(/[,，]/);
              const firstPart = locationParts[0].trim();
              province = firstPart.replace(/([省市区特别行政区]|自治区)$/, '');
            }
            
            // 如果没有提取到有效的省份名称，返回null
            if (!province) return null;
            
            return {
              id: path,
              url: photoUrl || '',
              title: albumsData[albumName]?.title || '',
              location: data.Location,
              date: data.DateTime,
              parsedDate,
              star: data.star || 0,
              province
            };
          })
          .filter((photo): photo is Photo => 
            photo !== null && 
            photo.url !== '' && 
            photo.province !== '未知地区'
          );

        // 调试：打印处理后的照片数量
        console.log('处理后的照片数量:', allPhotos.length);
        
        // 2. 按省份分组
        const photosByProvince = allPhotos.reduce((acc: { [key: string]: Photo[] }, photo) => {
          if (!acc[photo.province]) {
            acc[photo.province] = [];
          }
          acc[photo.province].push(photo);
          return acc;
        }, {});

        // 调试：打印每个省份的照片数量
        Object.entries(photosByProvince).forEach(([province, photos]) => {
          console.log(`${province}: ${photos.length}张照片`);
        });

        // 3. 从每个省份选择评分最高的照片
        const selectedPhotos = Object.entries(photosByProvince)
          .map(([province, provincePhotos]) => {
            // 按评分排序，选择最高分的照片
            const bestPhoto = provincePhotos.reduce((best, current) => {
              const currentStar = current.star || 0;
              const bestStar = best.star || 0;
              return currentStar > bestStar ? current : best;
            });

            // 调试：打印每个省份选中的照片信息
            console.log(`${province}最高评分照片:`, {
              star: bestPhoto.star,
              location: bestPhoto.rawLocation,
              date: bestPhoto.date,
              url: bestPhoto.url
            });

            return bestPhoto;
          })
          // 4. 按时间从远到近排序
          .sort((a, b) => {
            if (!a.parsedDate || !b.parsedDate) return 0;
            return a.parsedDate.getTime() - b.parsedDate.getTime();
          });

        // 调试：打印最终选择的照片数量
        console.log('最终选择的照片数量:', selectedPhotos.length);
        console.log('最终选择的省份:', selectedPhotos.map(p => p.province).join(', '));

        // 不限制数量，显示所有省份的照片
        setFeaturedPhotos(selectedPhotos);
        
        // 设置一个短暂的延时，确保DOM已经渲染
        setTimeout(() => {
          if (timelineRef.current) {
            timelineRef.current.scrollLeft = timelineRef.current.scrollWidth;
          }
        }, 100);

      } catch (error) {
        console.error('加载精选照片时出错:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFeaturedPhotos();
  }, []);

  // 自动切换背景图片
  useEffect(() => {
    if (featuredPhotos.length > 0) {
      const timer = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % featuredPhotos.length);
      }, 5000); // 每5秒切换一次

      return () => clearInterval(timer);
    }
  }, [featuredPhotos]);

  // 处理水平滚动
  const handleScroll = (direction: 'left' | 'right') => {
    if (!timelineRef.current) return;
    
    const scrollAmount = 300; // 每次滚动的距离
    const currentScroll = timelineRef.current.scrollLeft;
    const targetScroll = direction === 'right' 
      ? currentScroll + scrollAmount 
      : currentScroll - scrollAmount;
    
    timelineRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };

  return (
    <div className="min-h-screen dark:bg-gray-900">
      {/* 英雄区域 - 现代化设计 */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            className="absolute inset-0 z-0"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <Image
              src={featuredPhotos[currentImageIndex]?.url || "https://angyi.oss-cn-beijing.aliyuncs.com/gallery/北京/IMG_3734.webp"}
              alt="摄影作品展示"
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 text-center text-white px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 font-serif">
              Through The Lens
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto font-light leading-relaxed">
              记录光与影的诗意，捕捉生活的瞬间之美
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/browse" className="group relative inline-flex items-center justify-center px-8 py-3 bg-white/10 backdrop-blur-sm text-white rounded-full font-medium hover:bg-white/20 transition-all duration-300 overflow-hidden">
                <span className="relative z-10">浏览作品集</span>
                <motion.div
                  className="absolute inset-0 bg-white/10"
                  initial={false}
                  whileHover={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              </Link>
              <Link href="/map" className="group inline-flex items-center justify-center px-8 py-3 text-white/90 hover:text-white transition-colors">
                <span>探索地图</span>
                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* 向下滚动指示器 */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{
            y: [0, 10, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-white/50 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* 功能区域 - 现代简约设计 */}
      <section className="py-32 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-24"
          >
            <h2 className="text-4xl font-serif mb-6 dark:text-white">探索摄影世界</h2>
            <div className="w-24 h-1 bg-black dark:bg-white mx-auto mb-6" />
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-lg">
              多维度探索摄影作品，感受不同视角下的世界之美
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <ImageIcon size={32} weight="thin" />,
                title: "摄影作品",
                description: "探索精心挑选的摄影作品，感受独特的视觉语言",
                link: "/browse"
              },
              {
                icon: <Camera size={32} weight="thin" />,
                title: "相册集",
                description: "按主题浏览精心策划的相册，体验不同的故事线索",
                link: "/albums"
              },
              {
                icon: <GlobeHemisphereEast size={32} weight="thin" />,
                title: "地图寻迹",
                description: "在地图上探索拍摄足迹，感受地理空间中的视觉记忆",
                link: "/map"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className="group"
              >
                <Link 
                  href={item.link} 
                  className="block p-8 rounded-2xl transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="mb-6 text-gray-900 dark:text-white">{item.icon}</div>
                  <h3 className="text-xl font-medium mb-4 dark:text-white">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    {item.description}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 替换精选作品区域为时间线设计 */}
      <section className="py-32 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-24"
          >
            <h2 className="text-4xl font-serif mb-6">时光印记</h2>
            <div className="w-24 h-1 bg-black mx-auto mb-6" />
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              每一帧都是时间的切片，记录光影流转的瞬间
            </p>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="relative">
              {/* 时间线轴 */}
              <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-200 dark:bg-gray-700 -translate-y-1/2" />
              
              {/* 时间线内容容器 */}
              <div 
                ref={timelineRef}
                className="relative overflow-x-auto pb-12 hide-scrollbar scroll-smooth"
              >
                <motion.div 
                  className="flex space-x-16 px-8 min-w-max"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                >
                  {featuredPhotos.map((photo, index) => (
                    <motion.div
                      key={index}
                      className="relative"
                      initial={{ opacity: 0, y: index % 2 === 0 ? 20 : -20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                    >
                      {/* 时间节点 */}
                      <div className="absolute left-1/2 top-1/2 w-4 h-4 bg-white border-2 border-black rounded-full -translate-x-1/2 -translate-y-1/2 z-10" />
                      
                      {/* 照片容器 - 交替上下位置 */}
                      <div className={`relative ${index % 2 === 0 ? 'mb-32 mt-8' : 'mt-32 mb-8'}`}>
                        {/* 连接线 */}
                        <div className="absolute left-1/2 top-0 w-px h-full bg-gray-200 dark:bg-gray-700 -translate-x-1/2" />
                        
                        {/* 照片卡片 */}
                        <motion.div 
                          className="relative w-64 group"
                          whileHover={{ y: -5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <div className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-lg">
                            <Image
                              src={photo.url}
                              alt={photo.title || "摄影作品"}
                              fill
                              className="object-cover transition-all duration-700 group-hover:scale-105"
                              sizes="(max-width: 768px) 100vw, 256px"
                            />
                            {/* 渐变背景覆盖层 */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
                            
                            {/* 底部信息区域 */}
                            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                              {/* 省份名称 */}
                              <h3 className="text-base font-medium mb-1">
                                {photo.province}
                              </h3>
                              {/* 时间显示 */}
                              <div className="flex items-center text-white/80 text-xs tracking-wider">
                                {formatDate(photo.date, 'yearMonth')}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
              
              {/* 滚动控制按钮 */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <button
                  onClick={() => {
                    if (timelineRef.current) {
                      timelineRef.current.scrollBy({ left: -300, behavior: 'smooth' });
                    }
                  }}
                  className="flex items-center justify-center w-12 h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-md text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowRight size={20} className="rotate-180" />
                </button>
              </div>
              
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <button
                  onClick={() => {
                    if (timelineRef.current) {
                      timelineRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                    }
                  }}
                  className="flex items-center justify-center w-12 h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-md text-gray-800 dark:text-white hover:bg-white dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mt-24"
          >
            <Link
              href="/browse"
              className="inline-flex items-center px-8 py-3 bg-black text-white rounded-full hover:bg-gray-900 transition-colors"
            >
              探索完整时间线
              <ArrowRight size={16} className="ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>
      
      {/* 添加自定义样式 */}
      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

