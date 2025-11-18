import type { FileItem, FileType, SensorType } from '../types';
import { FileType as FileTypeEnum, SensorType as SensorTypeEnum } from '../types';

// WARNING: Storing API Secret on the client-side is a security risk.
// This should be handled by a backend service in a production environment.
const CLOUD_NAME = 'dsyinconz';
const API_KEY = '333762471822787';
const API_SECRET = '0lJ--RM1nizaH125ZgeTUvpdUcc';
const AUTH_HEADER = `Basic ${btoa(`${API_KEY}:${API_SECRET}`)}`;

const mapFormatToFileType = (format: string): FileType => {
  switch (format?.toLowerCase()) {
    case 'pdf': return FileTypeEnum.PDF;
    case 'png': return FileTypeEnum.PNG;
    case 'csv': return FileTypeEnum.CSV;
    case 'json': return FileTypeEnum.JSON;
    case 'txt': return FileTypeEnum.TXT;
    default: return FileTypeEnum.TXT;
  }
};

const inferSensorTypeFromName = (name: string): SensorType => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('temp') && lowerName.includes('hum')) return SensorTypeEnum.DHT22;
  if (lowerName.includes('light') || lowerName.includes('ldr') || lowerName.includes('intensity')) return SensorTypeEnum.LDR;
  if (lowerName.includes('air') || lowerName.includes('aqi') || lowerName.includes('mq135')) return SensorTypeEnum.MQ135;
  if (lowerName.includes('rain')) return SensorTypeEnum.Rain;
  if (lowerName.includes('soil') || lowerName.includes('moisture')) return SensorTypeEnum.Soil;
  return SensorTypeEnum.None;
};

const mapCloudinaryResourceToFileItem = (resource: any): FileItem => {
  const fileType = mapFormatToFileType(resource.format);
  const sensorType = inferSensorTypeFromName(resource.public_id);
  
  return {
    id: resource.public_id,
    name: resource.format ? `${resource.public_id}.${resource.format}` : resource.public_id,
    size: resource.bytes,
    uploadedAt: resource.created_at,
    modifiedAt: resource.created_at,
    type: fileType,
    sensorType: sensorType,
    content: '',
    url: resource.secure_url,
    resourceType: resource.resource_type,
  };
};

export const getFiles = async (): Promise<FileItem[]> => {
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/search?expression=`, {
    headers: { 'Authorization': AUTH_HEADER }
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to fetch files from Cloudinary: ${error.error.message}`);
  }
  const data = await response.json();
  return data.resources.map(mapCloudinaryResourceToFileItem);
};

async function sha1(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const uploadFile = async (file: File): Promise<FileItem> => {
    const timestamp = Math.round((new Date()).getTime() / 1000);
    const publicId = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = await sha1(stringToSign);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', API_KEY);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('public_id', publicId);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to upload file: ${error.error.message}`);
    }
    const data = await response.json();
    return mapCloudinaryResourceToFileItem(data);
};

export const renameFile = async (file: FileItem, newName: string): Promise<FileItem> => {
    const toPublicId = newName.substring(0, newName.lastIndexOf('.'));
    const resourceType = file.resourceType || 'raw';
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/${resourceType}/rename`, {
        method: 'POST',
        headers: {
            'Authorization': AUTH_HEADER,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from_public_id: file.id, to_public_id: toPublicId })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to rename file: ${error.error.message}`);
    }
    const data = await response.json();
    return mapCloudinaryResourceToFileItem(data);
};

export const deleteFile = async (file: FileItem): Promise<boolean> => {
    const resourceType = file.resourceType || 'raw';
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/${resourceType}/destroy`, {
        method: 'POST',
        headers: {
            'Authorization': AUTH_HEADER,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ public_id: file.id })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to delete file: ${error.error.message}`);
    }
    const data = await response.json();
    return data.result === 'ok';
};
