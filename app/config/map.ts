export const MAP_CONFIG = {
  AMAP_KEY: process.env.AMAP_KEY, // 从env获取
  CHINA_CENTER: [35.8617, 104.1954] as [number, number],
  DEFAULT_ZOOM: 4,
  DETAIL_ZOOM: 12,
  TILE_URL: {
    LIGHT: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    DARK: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  },
  ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}; 