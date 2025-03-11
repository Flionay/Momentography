import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MAP_CONFIG } from '@/app/config/map';
import 'leaflet/dist/leaflet.css'; // 确保 CSS 被导入

interface AMapContainerProps {
  center: [number, number];
  zoom: number;
  marker?: boolean;
  location?: string;
}

export default function AMapContainer({ center, zoom, marker = true, location }: AMapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 使用媒体查询检测暗色主题
  const isDarkMode = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

  useEffect(() => {
    // 清理之前的地图实例
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    if (!mapRef.current) return;

    try {
      console.log('初始化地图，中心点:', center, '缩放级别:', zoom);

      // 确保 center 是有效的坐标
      if (!center || !Array.isArray(center) || center.length !== 2 || 
          typeof center[0] !== 'number' || typeof center[1] !== 'number' ||
          isNaN(center[0]) || isNaN(center[1])) {
        console.error('无效的地图中心点:', center);
        setError('无效的地图坐标');
        return;
      }

      // 创建地图实例
      const map = L.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false
      });

      // 添加 OpenStreetMap 图层
      L.tileLayer(MAP_CONFIG.TILE_URL.LIGHT, {
        maxZoom: 19,
        attribution: MAP_CONFIG.ATTRIBUTION
      }).addTo(map);

      // 如果有坐标且需要显示标记，则添加标记
      if (marker && center) {
        const markerIcon = L.icon({
          iconUrl: '/images/marker-icon.png',
          iconRetinaUrl: '/images/marker-icon-2x.png',
          shadowUrl: '/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        const mapMarker = L.marker(center, { icon: markerIcon }).addTo(map);
        if (location) {
          mapMarker.bindPopup(location).openPopup();
        }
      }

      // 强制刷新地图大小
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      mapInstanceRef.current = map;

      // 监听系统主题变化
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleThemeChange = (e: MediaQueryListEvent) => {
        if (!mapInstanceRef.current) return;

        const map = mapInstanceRef.current;
        
        // 移除旧图层
        map.eachLayer((layer) => {
          if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
          }
        });

        // 添加新图层
        const newTileUrl = e.matches ? MAP_CONFIG.TILE_URL.DARK : MAP_CONFIG.TILE_URL.LIGHT;
        L.tileLayer(newTileUrl, {
          subdomains: ['1', '2', '3', '4'],
          maxZoom: 18,
          minZoom: 3
        }).addTo(map);
      };

      mediaQuery.addEventListener('change', handleThemeChange);

      // 清理函数
      return () => {
        mediaQuery.removeEventListener('change', handleThemeChange);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.error('地图初始化错误:', err);
      setError('地图加载失败');
    }
  }, [center, zoom, marker, location, isDarkMode]);

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-red-500">
        {error}
      </div>
    );
  }

  return <div ref={mapRef} className="h-full w-full" style={{ minHeight: '200px' }} />;
} 