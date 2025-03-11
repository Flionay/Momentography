'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Dialog } from '@headlessui/react';
import { Camera, Calendar } from '@phosphor-icons/react';
import 'leaflet/dist/leaflet.css';

// 动态导入地图组件以避免 SSR 问题
const Map = dynamic(
  async () => {
    const { MapContainer } = await import('react-leaflet');
    // 在这里设置默认图标
    const L = await import('leaflet');
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: '/images/marker-icon.png',
      iconRetinaUrl: '/images/marker-icon-2x.png',
      shadowUrl: '/images/marker-shadow.png',
    });
    return MapContainer;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
      </div>
    )
  }
);

// 其他动态导入保持不变
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);

interface Photo {
  id: string;
  url: string;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  date: string;
  cameraModel: string;
  exif: {
    [key: string]: string | number | null;
  };
}

export default function MapPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.9042, 116.4074]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadPhotos() {
      try {
        const albumsResp = await fetch('/data/albums.json');
        const albumsData = await albumsResp.json();
        
        const exifResp = await fetch('/data/exif_data.json');
        const exifData = await exifResp.json();
        
        const processedPhotos = Object.entries(exifData)
          .filter(([_, data]: [string, any]) => data.Latitude && data.Longitude)
          .map(([path, data]: [string, any]) => {
            const albumName = path.split('/')[0];
            const fileName = path.split('/')[1].split('.')[0];
            const album = albumsData[albumName];
            const photoUrl = album.images.find((url: string) => url.includes(fileName));
            
            return {
              id: path,
              url: photoUrl,
              title: albumsData[albumName]?.title || '未知相册',
              location: data.Location || '未知地点',
              latitude: data.Latitude,
              longitude: data.Longitude,
              date: data.DateTime || '未知时间',
              cameraModel: data.CameraModel || '未知相机',
              exif: {
                FNumber: data.FNumber,
                ISO: data.ISO,
                FocalLength: data.FocalLength,
                ExposureTime: data.ExposureTime,
                LensModel: data.LensModel,
              }
            };
          });
        
        setPhotos(processedPhotos);
        
        // 如果有照片，将地图中心设置为第一张照片的位置
        if (processedPhotos.length > 0) {
          setMapCenter([processedPhotos[0].latitude, processedPhotos[0].longitude]);
        }
      } catch (error) {
        console.error('加载照片数据时出错:', error);
      } finally {
        setIsLoading(false);
        setIsLoaded(true);
      }
    }

    loadPhotos();
  }, []);

  return (
    <div className="min-h-screen">
      {isLoaded ? (
        <div className="h-[calc(100vh-4rem)] relative">
          <Map
            center={mapCenter}
            zoom={13}
            className="h-full w-full z-0"
            scrollWheelZoom={true}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={19}
            />
            {photos.map((photo) => (
              <Marker
                key={photo.id}
                position={[photo.latitude, photo.longitude]}
                eventHandlers={{
                  click: () => setSelectedPhoto(photo),
                }}
              >
                <Popup>
                  <div className="p-2">
                    <div className="relative aspect-[4/3] w-48 mb-2">
                      <Image
                        src={photo.url}
                        alt={photo.title}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <h3 className="font-medium text-sm">{photo.title}</h3>
                    <p className="text-xs text-gray-600">{photo.location}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </Map>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
        </div>
      )}

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
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-600">
                      <Calendar size={18} className="mr-2" />
                      <span>{selectedPhoto.date}</span>
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