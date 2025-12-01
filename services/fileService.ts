// Updated frontend file with proper state management
import type { FileItem, FileType, SensorType } from "../types";
import {
  FileType as FileTypeEnum,
  SensorType as SensorTypeEnum,
} from "../types";

const API_BASE_URL = "https://cloud-storage-sensify-backend.onrender.com/api";

const mapFormatToFileType = (format: string): FileType => {
  switch (format?.toLowerCase()) {
    case "pdf":
      return FileTypeEnum.PDF;
    case "png":
    case "jpg":
    case "jpeg":
      return FileTypeEnum.PNG;
    case "csv":
      return FileTypeEnum.CSV;
    case "json":
      return FileTypeEnum.JSON;
    case "txt":
      return FileTypeEnum.TXT;
    default:
      return FileTypeEnum.TXT;
  }
};

const inferSensorTypeFromName = (name: string): SensorType => {
  const lower = name.toLowerCase();
  if (lower.includes("dht") || lower.includes("temp") || lower.includes("hum"))
    return SensorTypeEnum.DHT22;
  if (lower.includes("ldr") || lower.includes("light") || lower.includes("lux"))
    return SensorTypeEnum.LDR;
  if (lower.includes("mq135") || lower.includes("air") || lower.includes("aqi"))
    return SensorTypeEnum.MQ135;
  if (lower.includes("rain")) return SensorTypeEnum.Rain;
  if (lower.includes("soil")) return SensorTypeEnum.Soil;
  return SensorTypeEnum.None;
};

const mapCloudinaryResourceToFileItem = (resource: any): FileItem => {
  const fileType = mapFormatToFileType(resource.format);
  const sensorType = inferSensorTypeFromName(resource.public_id);

  return {
    id: resource.public_id,
    name: resource.original_filename || resource.public_id,
    size: resource.bytes,
    uploadedAt: resource.created_at,
    modifiedAt: resource.created_at,
    type: fileType,
    sensorType,
    content: "",
    url: resource.secure_url,
    resourceType: resource.resource_type,
  };
};

// FETCH FILES
export const getFiles = async (): Promise<FileItem[]> => {
  try {
    console.log("Fetching files from:", `${API_BASE_URL}/files`);

    const response = await fetch(`${API_BASE_URL}/files`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Fetch error:", errorData);
      throw new Error(errorData.error || "Failed to fetch files");
    }

    const resources = await response.json();
    console.log("Received files:", resources.length);

    return resources.map(mapCloudinaryResourceToFileItem);
  } catch (error) {
    console.error("getFiles error:", error);
    throw error;
  }
};

// UPLOAD FILE - Fixed to return proper response
// Change the parameter type from FileItem to File (browser File object)
export const uploadFile = async (
  file: File,
  uploadedAt: number
): Promise<FileItem> => {
  try {
    const publicId = `${file.name}-${uploadedAt}`;
    const form = new FormData();
    form.append("file", file);
    form.append("publicId", publicId);

    console.log("Uploading file:", publicId, "to:", `${API_BASE_URL}/files`);

    const res = await fetch(`${API_BASE_URL}/files`, {
      method: "POST",
      body: form,
    });

    console.log("Response status:", res.status);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Network error" }));
      throw new Error(error.error || `Upload failed with status ${res.status}`);
    }

    const data = await res.json();
    console.log("Upload response:", data);

    return mapCloudinaryResourceToFileItem(data);
  } catch (error) {
    console.error("Upload error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// RENAME FILE - Fixed to handle extension properly
export const renameFile = async (
  file: FileItem,
  newName: string
): Promise<FileItem> => {
  try {
    console.log("came into rename function")
    // Keep the original extension from the file
    const oldExtension = `${file.name}`.split(".").pop();
    let newPublicId = newName;

    // Remove extension from newName if it was provided
    console.log(newPublicId)
    newPublicId = newPublicId.replace(/\.[^/.]+$/, "");
    console.log(oldExtension, newPublicId, `${file.name}`)
    // Add back the original extension if the file had one
    if (oldExtension && `${file.name}`.includes(".")) {
      newPublicId = `${newPublicId}.${oldExtension}`;
    }

    console.log(
      "Renaming:",
      `${file.name}`,
      "to:",
      newPublicId,
      "type:",
      file.resourceType
    );

    const res = await fetch(
      `${API_BASE_URL}/files/${encodeURIComponent(`${file.name}`)}/rename`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newName: newPublicId,
          resourceType: file.resourceType || "raw",
        }),
      }
    );

    if (!res.ok) {
      const error = await res.json();
      console.log()
      console.error("Rename error response:", error);
      throw new Error(error.error || "Rename failed");
    }

    const data = await res.json();
    console.log("Rename response:", data);

    // Return the properly mapped file item with updated data
    return mapCloudinaryResourceToFileItem(data);
  } catch (error) {
    console.error("Rename request failed:", error);
    throw error;
  }
};

// DELETE FILE
export const deleteFile = async (file: FileItem): Promise<boolean> => {
  try {
    console.log("Deleting file:", `${file.name}-${file.uploadedAt}`, "type:", file.resourceType);

    const res = await fetch(
      `${API_BASE_URL}/files/${encodeURIComponent(`${file.name}`)}?resourceType=${file.resourceType || "raw"
      }`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Delete failed");
    }

    const data = await res.json();
    console.log("Delete response:", data);

    return data.result === "ok";
  } catch (error) {
    console.error("Delete error:", error);
    throw error;
  }
};
