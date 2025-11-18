export enum SensorType {
  DHT22 = 'DHT22',
  LDR = 'LDR',
  MQ135 = 'MQ135',
  Rain = 'Rain Sensor',
  Soil = 'Soil Moisture',
  None = 'None',
}

export enum FileType {
    CSV = 'CSV',
    JSON = 'JSON',
    TXT = 'Text',
    PDF = 'PDF',
    PNG = 'PNG',
}

export interface FileItem {
  id: string;
  name: string;
  size: number; // in bytes
  uploadedAt: string;
  modifiedAt: string;
  type: FileType;
  sensorType: SensorType;
  content?: string;
  url?: string;
  resourceType?: 'image' | 'raw' | 'video';
}

export type ViewMode = 'grid' | 'list';

export type SortOption = 'latest' | 'oldest' | 'recently-modified' | 'name-asc' | 'name-desc';

export type FilterType = SensorType | FileType | 'all';

export interface Insight {
  level: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
}

export interface DataPoint {
  timestamp: Date;
  temperature?: number;
  humidity?: number;
  light?: number;
  airQuality?: number;
}