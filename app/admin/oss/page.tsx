'use client';

import { useState, useEffect } from 'react';
import { updateAlbumsJsonData } from '@/app/utils/ossUtils';
import { motion } from 'framer-motion';
import { CloudArrowUp, Clock, Spinner, CheckCircle, XCircle, ArrowLeft, Database, Calendar } from '@phosphor-icons/react';
import Link from 'next/link';
import { OSS_CONFIG } from '@/app/config/oss';

export default function OssManagementPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; status?: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<{ 
    albums: { time: string | null; record: any | null }; 
    exif: { time: string | null; record: any | null }; 
  }>({
    albums: { time: null, record: null },
    exif: { time: null, record: null }
  });
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState<string>('••••••••••••••••');

  useEffect(() => {
    // 获取数据库的最后更新时间
    async function getLastUpdatedTime() {
      try {
        // 添加时间戳参数，确保每次请求都是新的
        const timestamp = new Date().getTime();
        const albumsResponse = await fetch(`/api/files/lastModified?type=albums&_t=${timestamp}`);
        const exifResponse = await fetch(`/api/files/lastModified?type=exif&_t=${timestamp}`);
        
        if (albumsResponse.ok) {
          const albumsData = await albumsResponse.json();
          setLastUpdated(prev => ({ 
            ...prev, 
            albums: { 
              time: albumsData.lastModified, 
              record: albumsData.lastUpdate 
            } 
          }));
        }
        
        if (exifResponse.ok) {
          const exifData = await exifResponse.json();
          setLastUpdated(prev => ({ 
            ...prev, 
            exif: { 
              time: exifData.lastModified, 
              record: exifData.lastUpdate 
            } 
          }));
        }
      } catch (error) {
        console.error('获取更新时间失败:', error);
      }
    }
    
    // 获取Webhook密钥
    async function getWebhookSecret() {
      try {
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/config/webhook-secret?_t=${timestamp}`);
        if (response.ok) {
          const data = await response.json();
          setWebhookSecret(data.webhookSecret);
        }
      } catch (error) {
        console.error('获取Webhook密钥失败:', error);
      }
    }
    
    getLastUpdatedTime();
    getWebhookSecret();
  }, []);

  const handleUpdateData = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      console.log("开始更新 OSS 数据...");
      const updateResult = await updateAlbumsJsonData();
      console.log("更新结果:", updateResult);
      setResult(updateResult);
      
      // 更新成功后，刷新最后更新时间
      if (updateResult.success) {
        console.log("正在获取最新的更新时间...");
        // 添加时间戳参数，确保每次请求都是新的
        const timestamp = new Date().getTime();
        const albumsResponse = await fetch(`/api/files/lastModified?type=albums&_t=${timestamp}`);
        const exifResponse = await fetch(`/api/files/lastModified?type=exif&_t=${timestamp}`);
        
        if (albumsResponse.ok) {
          const albumsData = await albumsResponse.json();
          console.log("相册更新时间数据:", albumsData);
          setLastUpdated(prev => ({ 
            ...prev, 
            albums: { 
              time: albumsData.lastModified, 
              record: albumsData.lastUpdate 
            } 
          }));
        } else {
          console.error("获取相册更新时间失败:", albumsResponse.statusText);
        }
        
        if (exifResponse.ok) {
          const exifData = await exifResponse.json();
          console.log("EXIF 更新时间数据:", exifData);
          setLastUpdated(prev => ({ 
            ...prev, 
            exif: { 
              time: exifData.lastModified, 
              record: exifData.lastUpdate 
            } 
          }));
        } else {
          console.error("获取 EXIF 更新时间失败:", exifResponse.statusText);
        }
      }
    } catch (error) {
      console.error("更新数据时出错:", error);
      setResult({ success: false, message: `更新失败: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsLoading(false);
      
      // 无论成功与否，都刷新最后更新时间
      try {
        // 添加时间戳参数，确保每次请求都是新的
        const timestamp = new Date().getTime();
        const albumsResponse = await fetch(`/api/files/lastModified?type=albums&_t=${timestamp}`);
        const exifResponse = await fetch(`/api/files/lastModified?type=exif&_t=${timestamp}`);
        
        if (albumsResponse.ok) {
          const albumsData = await albumsResponse.json();
          setLastUpdated(prev => ({ 
            ...prev, 
            albums: { 
              time: albumsData.lastModified, 
              record: albumsData.lastUpdate 
            } 
          }));
        }
        
        if (exifResponse.ok) {
          const exifData = await exifResponse.json();
          setLastUpdated(prev => ({ 
            ...prev, 
            exif: { 
              time: exifData.lastModified, 
              record: exifData.lastUpdate 
            } 
          }));
        }
      } catch (refreshError) {
        console.error("刷新更新时间失败:", refreshError);
      }
    }
  };

  // 格式化日期时间
  const formatDateTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return '未知';
    
    try {
      const date = new Date(dateTimeStr);
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.warn('无效的日期字符串:', dateTimeStr);
        return '未知';
      }
      
      // 将UTC时间转换为东八区时间
      // 创建一个新的日期对象，加上8小时的时差
      const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
      
      // 格式化北京时间
      return beijingDate.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (e) {
      console.error('格式化日期时出错:', e, dateTimeStr);
      return '未知';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">OSS 数据管理</h1>
          <Link 
            href="/admin" 
            className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft size={20} className="mr-1" />
            返回管理面板
          </Link>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6"
        >
          <div className="flex items-center mb-4">
            <CloudArrowUp size={24} className="text-blue-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">同步 OSS 数据</h2>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            点击下面的按钮从阿里云 OSS 获取最新的相册数据和 EXIF 数据。同步过程可能需要几分钟时间，请耐心等待。
          </p>
          
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            <motion.button
              onClick={handleUpdateData}
              disabled={isLoading}
              whileHover={!isLoading ? { scale: 1.02 } : {}}
              whileTap={!isLoading ? { scale: 0.98 } : {}}
              className={`px-6 py-3 rounded-lg flex items-center justify-center ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md'
              } transition-all`}
            >
              {isLoading ? (
                <>
                  <Spinner size={20} className="animate-spin mr-2" />
                  同步中...
                </>
              ) : (
                <>
                  <CloudArrowUp size={20} className="mr-2" />
                  同步 OSS 数据
                </>
              )}
            </motion.button>
            
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <Clock size={18} className="mr-2" />
              <span>上次同步时间：</span>
              <span className="ml-1 font-medium">
                {formatDateTime(lastUpdated.albums.time) ? formatDateTime(lastUpdated.albums.time) : '从未同步'}
              </span>
            </div>
          </div>
          
          {result && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`p-4 rounded-md flex items-start ${
                result.status === 'success' 
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                  : result.status === 'partial_success'
                    ? 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : result.status === 'warning'
                      ? 'bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {result.status === 'success' ? (
                <CheckCircle size={20} weight="fill" className="mr-2 mt-0.5 flex-shrink-0" />
              ) : result.status === 'partial_success' || result.status === 'warning' ? (
                <CheckCircle size={20} weight="fill" className="mr-2 mt-0.5 flex-shrink-0 text-yellow-500 dark:text-yellow-400" />
              ) : (
                <XCircle size={20} weight="fill" className="mr-2 mt-0.5 flex-shrink-0" />
              )}
              <div>
                {result.message}
              </div>
            </motion.div>
          )}
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <Database size={20} className="text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">相册数据</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">最后更新:</span>
                <span className="text-gray-900 dark:text-gray-200">{formatDateTime(lastUpdated.albums.time)}</span>
              </div>
              {lastUpdated.albums.record && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">更新状态:</span>
                  <span className={`font-medium ${
                    lastUpdated.albums.record.status === 'success' 
                      ? 'text-green-600 dark:text-green-400' 
                      : lastUpdated.albums.record.status === 'warning' || lastUpdated.albums.record.status === 'partial_success'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}>
                    {lastUpdated.albums.record.status === 'success' ? '成功' : 
                     lastUpdated.albums.record.status === 'warning' ? '警告' :
                     lastUpdated.albums.record.status === 'partial_success' ? '部分成功' : '失败'}
                  </span>
                </div>
              )}
              {lastUpdated.albums.record && lastUpdated.albums.record.message && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {lastUpdated.albums.record.message}
                </div>
              )}
              {lastUpdated.albums.record && lastUpdated.albums.record.created_at && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                  <Calendar size={16} className="mr-1" />
                  {formatDateTime(lastUpdated.albums.record.created_at)}
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <Database size={20} className="text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">EXIF 数据</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">最后更新:</span>
                <span className="text-gray-900 dark:text-gray-200">{formatDateTime(lastUpdated.exif.time)}</span>
              </div>
              {lastUpdated.exif.record && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">更新状态:</span>
                  <span className={`font-medium ${
                    lastUpdated.exif.record.status === 'success' 
                      ? 'text-green-600 dark:text-green-400' 
                      : lastUpdated.exif.record.status === 'warning' || lastUpdated.exif.record.status === 'partial_success'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}>
                    {lastUpdated.exif.record.status === 'success' ? '成功' : 
                     lastUpdated.exif.record.status === 'warning' ? '警告' :
                     lastUpdated.exif.record.status === 'partial_success' ? '部分成功' : '失败'}
                  </span>
                </div>
              )}
              {lastUpdated.exif.record && lastUpdated.exif.record.message && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {lastUpdated.exif.record.message}
                </div>
              )}
              {lastUpdated.exif.record && lastUpdated.exif.record.created_at && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                  <Calendar size={16} className="mr-1" />
                  {formatDateTime(lastUpdated.exif.record.created_at)}
                </div>
              )}
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6"
        >
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Webhook 信息</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            您可以通过以下 Webhook 端点自动更新数据：
          </p>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mb-4 font-mono text-sm overflow-x-auto">
            POST /api/webhook
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            请在请求头中添加以下验证信息：
          </p>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md font-mono text-sm overflow-x-auto flex justify-between items-center">
            <span>x-webhook-secret: {showWebhookSecret ? webhookSecret : '••••••••••••••••'}</span>
            <button 
              onClick={() => setShowWebhookSecret(!showWebhookSecret)}
              className="ml-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showWebhookSecret ? '隐藏' : '显示'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 