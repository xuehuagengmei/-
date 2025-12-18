export interface ShotConfig {
  id: number;
  label: string; // e.g., "镜头01"
  defaultType: string; // The selected preset type
  content: string; // The generated prompt content
  isLoading: boolean;
}

export interface ShotPreset {
  value: string;
  label: string;
}

export type Language = 'zh' | 'en';

export interface GeneratedScene {
  description: string;
}

export interface BatchResponse {
  shots: string[];
}