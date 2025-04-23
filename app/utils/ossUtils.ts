'use server';

import fs from 'fs';
import path from 'path';
import OSS from 'ali-oss';
import yaml from 'js-yaml';
import { OSS_CONFIG } from '../config/oss';
import { saveAlbums, saveExifData, logUpdate } from './dbUtils';

// 确保目录存在
function ensureDirectoryExists(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

// 创建 OSS 客户端
function createOssClient() {
  return new OSS({
    accessKeyId: OSS_CONFIG.ACCESS_KEY,
    accessKeySecret: OSS_CONFIG.SECRET_KEY,
    endpoint: OSS_CONFIG.ENDPOINT,
    bucket: OSS_CONFIG.BUCKET,
    timeout: 30000, // 全局超时设置为 30 秒
  } as any);
}

// 从 OSS 获取 EXIF 数据并更新数据库
export async function getExifJson() {
  try {
    const client = createOssClient();
    
    // 从 OSS 获取 EXIF 数据，添加超时设置
    const result = await client.get(OSS_CONFIG.OSS_EXIF_DATA_KEY, {
      timeout: 30000 // 增加到30秒超时
    });
    
    try {
      const contentStr = result.content.toString();

      
      // 尝试解析 JSON
      let exifDataDict;
      try {
        exifDataDict = JSON.parse(contentStr);

      } catch (parseError) {

        const errorMsg = `解析 EXIF 数据失败，请检查数据格式`;
        logUpdate('exif', 'error', errorMsg);
        return { success: false, message: errorMsg, status: 'error' };
      }
      
      // 验证解析后的数据是否为对象
      if (!exifDataDict) {
        const errorMsg = `解析的 EXIF 数据为空`;
        logUpdate('exif', 'error', errorMsg);
        return { success: false, message: errorMsg, status: 'error' };
      }
      
      if (typeof exifDataDict !== 'object') {
        const errorMsg = `解析的 EXIF 数据不是对象类型: ${typeof exifDataDict}`;
        logUpdate('exif', 'error', errorMsg);
        return { success: false, message: errorMsg, status: 'error' };
      }
      
      // 如果是数组，尝试转换为对象
      if (Array.isArray(exifDataDict)) {
        const convertedData: Record<string, any> = {};
        let hasValidData = false;
        
        for (let i = 0; i < exifDataDict.length; i++) {
          const item = exifDataDict[i];
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            // 尝试找到可以作为键的字段
            const key = item.FileName || item.fileName || item.filename || 
                       item.file_name || item.name || item.id || 
                       `item_${i}`;
            
            convertedData[key] = item;
            hasValidData = true;

          }
        }
        
        if (!hasValidData) {
          const errorMsg = `EXIF 数据数组中没有有效的数据项`;
          logUpdate('exif', 'error', errorMsg);
          return { success: false, message: errorMsg, status: 'error' };
        }
        
        exifDataDict = convertedData;
      }
      
      // 检查是否为空对象
      if (Object.keys(exifDataDict).length === 0) {
        const warningMsg = `EXIF 数据为空对象`;
        logUpdate('exif', 'warning', warningMsg);
        return { success: true, message: warningMsg, status: 'warning' };
      }
      
      // 确保 exifDataDict 是一个普通对象
      const safeExifData: Record<string, any> = {};
      
      try {
        // 安全地复制键值对
        for (const key of Object.keys(exifDataDict)) {
          if (key && typeof key === 'string') {
            safeExifData[key] = exifDataDict[key];
          }
        }
      } catch (copyError) {
        const errorMsg = `处理 EXIF 数据时出错: ${copyError instanceof Error ? copyError.message : String(copyError)}`;
        logUpdate('exif', 'error', errorMsg);
        return { success: false, message: errorMsg, status: 'error' };
      }
      
      // 保存到数据库
      const saveResult = saveExifData(safeExifData);
      
      // 记录更新操作
      if (saveResult.success) {
        logUpdate('exif', 'success', saveResult.message);
      } else {
        logUpdate('exif', 'error', saveResult.message);
      }
      
      return { ...saveResult, status: saveResult.success ? saveResult.status : 'error' };
    } catch (parseError) {
      const errorMsg = `解析 EXIF 数据失败，请检查数据格式`;
      logUpdate('exif', 'error', errorMsg);
      return { success: false, message: errorMsg, status: 'error' };
    }
  } catch (error) {
    const errorMsg = `从 OSS 获取 EXIF 数据失败，请检查网络连接和 OSS 配置`;
    logUpdate('exif', 'error', errorMsg);
    return { success: false, message: errorMsg, status: 'error' };
  }
}

// 将日期对象转换为字符串
function convertDates(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'object') {
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => convertDates(item));
    }
    
    const result: Record<string, any> = {};
    for (const key in obj) {
      result[key] = convertDates(obj[key]);
    }
    return result;
  }
  
  return obj;
}

// 更新相册数据
export async function updateAlbumsJsonData() {
  try {
    const client = createOssClient();
    
    // 存储相册信息的字典
    const albums: Record<string, any> = {};
    
    // 列出文件夹中的所有文件
    const ossPrefix = OSS_CONFIG.OSS_GALLERY_PREFIX;
    
    // 使用类似 Python 中的 ObjectIterator 方式遍历所有对象
    // 首先获取所有对象的列表
    const allObjects = [];
    let marker = null;
    
    do {
      const result = await client.list({
        prefix: ossPrefix,
        marker,
        'max-keys': 100
      });
      
      marker = result.nextMarker;
      
      if (result.objects) {
        allObjects.push(...result.objects);
      }
      
    } while (marker);
    
    // 遍历对象列表，找出所有 YAML 文件
    let albumCount = 0;
    
    for (const obj of allObjects) {
      const key = obj.name;
      
      // 如果是YAML文件，则读取内容
      if (key.endsWith('.yaml') || key.endsWith('.yml')) {
        try {
          const result = await client.get(key);
          const yamlContent = result.content.toString();
          
          // 解析YAML
          const albumData = yaml.load(yamlContent) as Record<string, any>;
          
          // 从路径中提取相册ID
          const parts = key.split('/');
          const albumId = parts[parts.length - 2]; // 假设路径格式是 prefix/albumId/info.yaml
          
          if (albumId && albumData) {
            // 将数据添加到相册字典中
            albums[albumId] = albumData;
            albumCount++;
          }
        } catch (yamlError) {
          continue;
        }
      }
    }
    
    if (albumCount === 0) {
      return { success: false, message: '没有获取到任何相册数据', status: 'error' };
    }
    
    // 处理相册数据，确保兼容性
    Object.entries(albums).forEach(([albumId, album]) => {
      if (album.desc && !album.description) {
        // 将desc字段映射到description字段
        album.description = album.desc;
      }
    });
    
    // 保存相册数据到数据库
    const saveResult = saveAlbums(albums);
    
    // 记录更新操作
    if (saveResult.success) {
      logUpdate('albums', 'success', '相册数据已更新');
    }
    
    return { success: true, message: '相册数据已更新', status: 'success' };
  } catch (error) {
    const errorMessage = `更新相册数据失败: ${error instanceof Error ? error.message : String(error)}`;
    logUpdate('albums', 'error', errorMessage);
    return { success: false, message: errorMessage, status: 'error' };
  }
}

// 更新所有数据
export async function updateAllData() {
  // 更新相册数据
  const albumsResult = await updateAlbumsJsonData();
  
  // 更新EXIF数据
  // 添加重试机制，因为EXIF数据较大，可能需要多次尝试
  const maxRetries = 3;
  let retryCount = 0;
  let exifResult = { success: false, message: '初始化', status: 'pending' as 'pending' | 'success' | 'error' | 'warning' };
  
  while (retryCount < maxRetries) {
    try {
      exifResult = await getExifJson();
      
      if (exifResult.success || exifResult.status === 'warning') {
        break;
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 3000));
      retryCount++;
    } catch (retryError) {
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 3000));
      retryCount++;
    }
  }
  
  // 获取最终状态
  const albumsStatus = albumsResult.status || (albumsResult.success ? 'success' : 'error');
  const exifStatus = exifResult.status || (exifResult.success ? 'success' : 'error');
  
  // 获取消息
  const albumsMessage = albumsResult.message || (albumsResult.success ? '相册数据更新成功' : '相册数据更新失败');
  const exifMessage = exifResult.message || (exifResult.success ? 'EXIF数据更新成功' : 'EXIF数据更新失败');
  
  // 检查是否都成功
  if (albumsStatus === 'success' || albumsStatus === 'warning') {
    if (exifStatus === 'success' || exifStatus === 'warning') {
      return { 
        success: true, 
        message: `所有数据已更新${albumsStatus === 'warning' || exifStatus === 'warning' ? '（有警告）' : ''}`, 
        albumsResult, 
        exifResult 
      };
    } else {
      return { 
        success: false, 
        message: `相册数据更新成功，但EXIF数据更新失败: ${exifMessage}`, 
        albumsResult, 
        exifResult 
      };
    }
  } else {
    return { 
      success: false, 
      message: `数据更新失败: 相册=${albumsMessage}, EXIF=${exifMessage}`, 
      albumsResult, 
      exifResult 
    };
  }
} 