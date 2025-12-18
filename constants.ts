import { ShotConfig, ShotPreset } from './types';

export const SHOT_PRESETS: ShotPreset[] = [
  { value: 'High Angle (俯视)', label: '高角度 (俯视)' },
  { value: 'Over the Shoulder (过肩镜头)', label: '过肩镜头' },
  { value: 'Low Angle (低角度仰拍)', label: '低角度仰拍' },
  { value: 'Cowboy Shot (七分身)', label: '七分身 (牛仔景)' },
  { value: 'Close Up (特写)', label: '特写' },
  { value: 'Medium Close Up (中近景)', label: '中近景' },
  { value: 'Dutch Angle (荷兰角)', label: '荷兰角' },
  { value: 'Ground Level (地面层)', label: '地面层' },
  { value: 'Silhouette (剪影)', label: '剪影' },
  { value: 'Wide Shot (广角全景)', label: '广角全景' },
  { value: 'Eye Level (平视)', label: '平视' },
  { value: 'Aerial View (航拍)', label: '航拍' },
  { value: 'Macro (微距)', label: '微距' },
  { value: 'Fish Eye (鱼眼)', label: '鱼眼' },
];

export const INITIAL_SHOTS: ShotConfig[] = [
  { id: 1, label: '镜头01', defaultType: 'High Angle (俯视)', content: '', isLoading: false },
  { id: 2, label: '镜头02', defaultType: 'Over the Shoulder (过肩镜头)', content: '', isLoading: false },
  { id: 3, label: '镜头03', defaultType: 'Low Angle (低角度仰拍)', content: '', isLoading: false },
  { id: 4, label: '镜头04', defaultType: 'Cowboy Shot (七分身)', content: '', isLoading: false },
  { id: 5, label: '镜头05', defaultType: 'Close Up (特写)', content: '', isLoading: false },
  { id: 6, label: '镜头06', defaultType: 'Medium Close Up (中近景)', content: '', isLoading: false },
  { id: 7, label: '镜头07', defaultType: 'Dutch Angle (荷兰角)', content: '', isLoading: false },
  { id: 8, label: '镜头08', defaultType: 'Ground Level (地面层)', content: '', isLoading: false },
  { id: 9, label: '镜头09', defaultType: 'Silhouette (剪影)', content: '', isLoading: false },
];

export const MOCK_SCENE_PLACEHOLDER = "请先上传图片并点击“开始分析”以生成场景描述...";