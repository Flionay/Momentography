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
    
    console.log("正在从 OSS 获取 EXIF 数据...");
    
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
        console.error(errorMsg);
        logUpdate('exif', 'error', errorMsg);
        return { success: false, message: errorMsg, status: 'error' };
      }
      
      if (typeof exifDataDict !== 'object') {
        const errorMsg = `解析的 EXIF 数据不是对象类型: ${typeof exifDataDict}`;
        console.error(errorMsg);
        logUpdate('exif', 'error', errorMsg);
        return { success: false, message: errorMsg, status: 'error' };
      }
      
      // 如果是数组，尝试转换为对象
      if (Array.isArray(exifDataDict)) {
        console.warn("EXIF 数据是数组格式，尝试转换为对象格式");
        
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

          } else {
            console.warn(`跳过无效的数组项 ${i}:`, item);
          }
        }
        
        if (!hasValidData) {
          const errorMsg = `EXIF 数据数组中没有有效的数据项`;
          console.error(errorMsg);
          logUpdate('exif', 'error', errorMsg);
          return { success: false, message: errorMsg, status: 'error' };
        }
        
        exifDataDict = convertedData;

      }
      
      // 检查是否为空对象
      if (Object.keys(exifDataDict).length === 0) {
        const warningMsg = `EXIF 数据为空对象`;
        console.warn(warningMsg);
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
        
        console.log(`安全处理后的 EXIF 数据包含 ${Object.keys(safeExifData).length} 个键值对`);
      } catch (copyError) {
        console.error("复制 EXIF 数据时出错:", copyError);
        const errorMsg = `处理 EXIF 数据时出错: ${copyError instanceof Error ? copyError.message : String(copyError)}`;
        logUpdate('exif', 'error', errorMsg);
        return { success: false, message: errorMsg, status: 'error' };
      }
      
      console.log(`获取到 ${Object.keys(safeExifData).length} 条 EXIF 记录`);
      
      // 保存到数据库
      const saveResult = saveExifData(safeExifData);
      
      // 记录更新操作
      if (saveResult.success) {
        logUpdate('exif', 'success', saveResult.message);
      } else {
        logUpdate('exif', 'error', saveResult.message);
      }
      
      console.log("EXIF 数据已更新并保存到数据库。");
      return { ...saveResult, status: saveResult.success ? saveResult.status : 'error' };
    } catch (parseError) {
      const errorMsg = `解析 EXIF 数据失败，请检查数据格式`;
      console.error(errorMsg, parseError);
      logUpdate('exif', 'error', errorMsg);
      return { success: false, message: errorMsg, status: 'error' };
    }
  } catch (error) {
    const errorMsg = `从 OSS 获取 EXIF 数据失败，请检查网络连接和 OSS 配置`;
    console.error(errorMsg, error);
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
    
    console.log("正在从 OSS 获取文件列表...");
    
    // 使用类似 Python 中的 ObjectIterator 方式遍历所有对象
    // 首先获取所有对象的列表
    let nextMarker = null;
    let isTruncated = true;
    let allObjects: any[] = [];
    
    while (isTruncated) {
      // @ts-ignore - ali-oss 类型定义与实际使用方式不同
      const result = await client.list({
        prefix: ossPrefix,
        'max-keys': 1000,
        marker: nextMarker,
        timeout: 30000 // 增加到30秒超时设置
      });
      
      console.log(`获取到一批对象，数量: ${result.objects ? result.objects.length : 0}`);
      
      if (result.objects && result.objects.length > 0) {
        allObjects = allObjects.concat(result.objects);
      }
      
      nextMarker = result.nextMarker;
      isTruncated = result.isTruncated;
    }
    
    console.log(`总共获取到 ${allObjects.length} 个对象`);
    
    // 按照 Python 脚本的方式处理对象
    for (const obj of allObjects) {
      const key = obj.name;
      
      // 处理图片文件
      if (key.endsWith('.webp') || key.endsWith('.jpg') || 
          key.endsWith('.jpeg') || key.endsWith('.png') || 
          key.endsWith('.JPG') || key.endsWith('.JPEG')) {
        // 生成图片链接
        const imageUrl = `https://${OSS_CONFIG.BUCKET}.${OSS_CONFIG.ENDPOINT.split('//')[1]}/${key}`;
        
        // 获取相册名称（假设相册名称是文件路径的第二部分）
        const parts = key.split('/');
        if (parts.length < 2) continue;
        
        const albumName = parts[1];
        if (!albumName) continue;
        
        // 初始化相册对象（如果不存在）
        if (!albums[albumName]) {
          albums[albumName] = { images: [] };
        }
        
        // 添加图片链接到相册
        albums[albumName].images.push(imageUrl);
      } 
      // 处理 YAML 文件
      else if (key.endsWith('.yaml')) {
        try {
          // 读取 YAML 文件
          const yamlResult = await client.get(key, {
            timeout: 20000 // 增加到20秒超时
          });
          
          // 解析 YAML 内容
          const albumInfo = yaml.load(yamlResult.content.toString());
          
          // 获取相册名称
          const parts = key.split('/');
          if (parts.length < 2) continue;
          
          const albumName = parts[1];
          if (!albumName) continue;
          
          // 初始化相册对象（如果不存在）
          if (!albums[albumName]) {
            albums[albumName] = { images: [] };
          }
          
          // 更新相册信息
          Object.assign(albums[albumName], albumInfo);
        } catch (yamlError) {
          console.error(`读取 YAML 文件 ${key} 失败:`, yamlError);
        }
      }
    }
    
    // 检查是否获取到了相册数据
    const albumCount = Object.keys(albums).length;
    console.log(`共获取到 ${albumCount} 个相册`);
    
    if (albumCount === 0) {
      console.warn("警告: 没有获取到任何相册数据!");
      logUpdate('albums', 'warning', '没有获取到任何相册数据');
      return { success: false, message: '没有获取到任何相册数据', status: 'warning' };
    } else {
      // 转换相册信息中的日期
      const processedAlbums = convertDates(albums);
      
      // 将信息保存到数据库
      const saveResult = saveAlbums(processedAlbums);
      
      // 记录更新操作
      logUpdate('albums', 'success', `更新了 ${albumCount} 个相册`);
      
      console.log("相册信息已保存到数据库。");
      
      // 如果相册保存失败，直接返回错误
      if (!saveResult.success) {
        return saveResult;
      }
    }
    
    // 从 OSS 下载 exif_data.json 保存到数据库
    let exifResult;
    let exifSuccess = false;
    let exifMessage = '';
    let exifStatus = 'error';
    
    try {
      console.log("开始获取 EXIF 数据...");
      
      // 尝试最多3次获取EXIF数据
      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`EXIF 数据获取尝试 ${retryCount + 1}/${maxRetries}`);
          exifResult = await getExifJson();
          
          if (exifResult.success) {
            console.log(`EXIF 数据获取成功，状态: ${exifResult.status}`);
            break;
          } else {
            lastError = new Error(exifResult.message);
            console.warn(`EXIF 数据获取失败，将重试: ${exifResult.message}`);
            retryCount++;
            
            if (retryCount < maxRetries) {
              // 等待一段时间再重试
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } catch (retryError) {
          lastError = retryError;
          console.error(`EXIF 数据获取出错，将重试:`, retryError);
          retryCount++;
          
          if (retryCount < maxRetries) {
            // 等待一段时间再重试
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (exifResult && exifResult.success) {
        exifSuccess = true;
        exifMessage = exifResult.message;
        exifStatus = exifResult.status || 'success';
        console.log(`EXIF 数据更新${exifStatus === 'warning' ? '有警告' : '成功'}: ${exifMessage}`);
      } else {
        exifSuccess = false;
        exifMessage = lastError ? 
          `获取 EXIF 数据失败 (${maxRetries} 次尝试后): ${lastError instanceof Error ? lastError.message : String(lastError)}` : 
          '获取 EXIF 数据失败，未知错误';
        console.warn("EXIF 数据更新失败:", exifMessage);
        // 记录 EXIF 更新失败
        logUpdate('exif', 'error', exifMessage, 'error');
      }
    } catch (exifError) {
      exifSuccess = false;
      exifMessage = `获取 EXIF 数据时出错: ${exifError instanceof Error ? exifError.message : '未知错误'}`;
      console.error(exifMessage);
      // 记录 EXIF 更新失败
      logUpdate('exif', 'error', exifMessage, 'error');
    }
    
    // 返回综合状态
    if (exifSuccess && exifStatus === 'success') {
      // 两者都成功
      return { 
        success: true, 
        message: `相册数据更新成功，共获取到 ${albumCount} 个相册。EXIF 数据更新成功。`,
        status: 'success'
      };
    } else if (exifSuccess && exifStatus === 'warning') {
      // EXIF 有警告
      return { 
        success: true, 
        message: `相册数据更新成功，共获取到 ${albumCount} 个相册。EXIF 数据更新有警告: ${exifMessage}`,
        status: 'partial_success'
      };
    } else {
      // 相册成功但 EXIF 失败 - 返回部分成功状态
      return { 
        success: true, 
        message: `相册数据更新成功，共获取到 ${albumCount} 个相册。但 EXIF 数据更新失败: ${exifMessage}`,
        status: 'partial_success'
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('更新相册数据时出错:', errorMessage);
    logUpdate('albums', 'error', `更新相册数据时出错: ${errorMessage}`, 'error');
    return { 
      success: false, 
      message: `更新相册数据失败: ${errorMessage}`,
      status: 'error'
    };
  }
} 