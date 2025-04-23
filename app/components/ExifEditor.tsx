'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  MapPin, 
  Calendar, 
  Clock, 
  X, 
  CheckCircle, 
  Warning, 
  Info,
  ArrowClockwise
} from '@phosphor-icons/react';

interface ExifEditorProps {
  photoId: string;
  exifData: {
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
  };
  onClose: () => void;
  onSave: (updatedData: any) => Promise<void>;
}

export default function ExifEditor({ photoId, exifData, onClose, onSave }: ExifEditorProps) {
  const [formData, setFormData] = useState({
    camera_model: exifData.camera_model || '',
    lens_model: exifData.lens_model || '',
    f_number: exifData.f_number || '',
    exposure_time: exifData.exposure_time || '',
    iso: exifData.iso || '',
    focal_length: exifData.focal_length || '',
    location: exifData.location || '',
    date_time: exifData.date_time || '',
    latitude: exifData.latitude || '',
    longitude: exifData.longitude || ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showTips, setShowTips] = useState(false);

  // 检查EXIF数据完善度
  const incompleteFields = Object.entries(formData).filter(([_, value]) => {
    return !value || value.toString().toLowerCase().includes('未知');
  }).map(([key]) => key);
  
  const completionPercentage = Math.round(
    ((Object.keys(formData).length - incompleteFields.length) / Object.keys(formData).length) * 100
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReset = () => {
    setFormData({
      camera_model: exifData.camera_model || '',
      lens_model: exifData.lens_model || '',
      f_number: exifData.f_number || '',
      exposure_time: exifData.exposure_time || '',
      iso: exifData.iso || '',
      focal_length: exifData.focal_length || '',
      location: exifData.location || '',
      date_time: exifData.date_time || '',
      latitude: exifData.latitude || '',
      longitude: exifData.longitude || ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveStatus('idle');
    setErrorMessage('');
    
    try {
      // 转换数值类型
      const processedData = {
        ...formData,
        f_number: formData.f_number ? parseFloat(formData.f_number as string) : null,
        iso: formData.iso ? parseInt(formData.iso as string, 10) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude as string) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude as string) : null
      };
      
      await onSave({
        photoId,
        exifData: processedData
      });
      
      setSaveStatus('success');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取字段中文名称
  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      camera_model: '相机型号',
      lens_model: '镜头型号',
      f_number: '光圈值',
      exposure_time: '快门速度',
      iso: 'ISO',
      focal_length: '焦距',
      location: '拍摄地点',
      date_time: '拍摄时间',
      latitude: '纬度',
      longitude: '经度'
    };
    return labels[field] || field;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" 
      style={{ position: 'fixed', zIndex: 9999 }}
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Camera size={20} className="mr-2 text-blue-500" />
            编辑EXIF数据
          </h2>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* 完善度指示器 */}
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              EXIF数据完善度: {completionPercentage}%
            </span>
            <button 
              onClick={() => setShowTips(!showTips)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center"
            >
              <Info size={16} className="mr-1" />
              {showTips ? '隐藏提示' : '查看提示'}
            </button>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${
                completionPercentage < 50 ? 'bg-red-500' : 
                completionPercentage < 80 ? 'bg-yellow-500' : 
                'bg-green-500'
              }`} 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          
          {showTips && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md text-sm">
              <p className="mb-2">完善EXIF数据有助于更好地组织和搜索照片。</p>
              {incompleteFields.length > 0 && (
                <div>
                  <p className="font-medium">以下字段尚未完善:</p>
                  <ul className="list-disc list-inside mt-1">
                    {incompleteFields.map(field => (
                      <li key={field}>{getFieldLabel(field)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit(e);
          }} 
          className="p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="camera_model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                相机型号
              </label>
              <div className="relative">
                <Camera size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="camera_model"
                  type="text"
                  name="camera_model"
                  value={formData.camera_model}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !formData.camera_model || formData.camera_model.toLowerCase().includes('未知') 
                      ? 'border-yellow-300 dark:border-yellow-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="例如: Canon EOS R5"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="lens_model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                镜头型号
              </label>
              <input
                id="lens_model"
                type="text"
                name="lens_model"
                value={formData.lens_model}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  !formData.lens_model || formData.lens_model.toLowerCase().includes('未知') 
                    ? 'border-yellow-300 dark:border-yellow-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="例如: RF 24-70mm f/2.8L IS USM"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="f_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  光圈值
                </label>
                <input
                  id="f_number"
                  type="text"
                  name="f_number"
                  value={formData.f_number}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !formData.f_number || formData.f_number.toString().toLowerCase().includes('未知') 
                      ? 'border-yellow-300 dark:border-yellow-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="例如: 2.8"
                />
              </div>
              
              <div>
                <label htmlFor="exposure_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  快门速度
                </label>
                <input
                  id="exposure_time"
                  type="text"
                  name="exposure_time"
                  value={formData.exposure_time}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !formData.exposure_time || formData.exposure_time.toLowerCase().includes('未知') 
                      ? 'border-yellow-300 dark:border-yellow-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="例如: 1/125"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="iso" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ISO
                </label>
                <input
                  id="iso"
                  type="text"
                  name="iso"
                  value={formData.iso}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !formData.iso || formData.iso.toString().toLowerCase().includes('未知') 
                      ? 'border-yellow-300 dark:border-yellow-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="例如: 100"
                />
              </div>
              
              <div>
                <label htmlFor="focal_length" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  焦距
                </label>
                <input
                  id="focal_length"
                  type="text"
                  name="focal_length"
                  value={formData.focal_length}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !formData.focal_length || formData.focal_length.toLowerCase().includes('未知') 
                      ? 'border-yellow-300 dark:border-yellow-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="例如: 50mm"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                拍摄地点
              </label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="location"
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !formData.location || formData.location.toLowerCase().includes('未知') 
                      ? 'border-yellow-300 dark:border-yellow-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="例如: 北京市海淀区"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="date_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                拍摄时间
              </label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="date_time"
                  type="text"
                  name="date_time"
                  value={formData.date_time}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !formData.date_time || formData.date_time.toLowerCase().includes('未知') 
                      ? 'border-yellow-300 dark:border-yellow-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="例如: 2023:05:20 14:30:00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  纬度
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !formData.latitude || formData.latitude.toString().toLowerCase().includes('未知') 
                      ? 'border-yellow-300 dark:border-yellow-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="例如: 39.9042"
                />
              </div>
              
              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  经度
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    !formData.longitude || formData.longitude.toString().toLowerCase().includes('未知') 
                      ? 'border-yellow-300 dark:border-yellow-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="例如: 116.4074"
                />
              </div>
            </div>
          </div>
          
          {saveStatus === 'error' && (
            <div className="mt-4 p-3 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-md flex items-start">
              <Warning size={18} weight="fill" className="mr-2 mt-0.5 flex-shrink-0" />
              <div>{errorMessage || '保存失败，请重试'}</div>
            </div>
          )}
          
          {saveStatus === 'success' && (
            <div className="mt-4 p-3 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-md flex items-start">
              <CheckCircle size={18} weight="fill" className="mr-2 mt-0.5 flex-shrink-0" />
              <div>EXIF数据已成功保存</div>
            </div>
          )}
          
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
              disabled={isSubmitting}
            >
              <ArrowClockwise size={18} className="mr-2" />
              重置
            </button>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                disabled={isSubmitting}
              >
                取消
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg text-white ${
                  isSubmitting
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors flex items-center`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Clock size={18} className="animate-spin mr-2" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
} 