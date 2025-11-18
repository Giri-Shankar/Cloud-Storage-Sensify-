import React from 'react';
import { FileText, Image, Database, File as FileIconLucide } from 'lucide-react';
import { FileType } from './types';

export const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
};

export const getFileIcon = (type: FileType) => {
    // FIX: Changed "aria-hidden" value from string "true" to boolean `true` to match the `Booleanish` type.
    const commonProps = { "aria-hidden": true };
    const baseClassName = "w-8 h-8";
    switch (type) {
        case FileType.PDF: return React.createElement(FileText, { ...commonProps, className: `${baseClassName} text-red-500` });
        case FileType.PNG: return React.createElement(Image, { ...commonProps, className: `${baseClassName} text-blue-500` });
        case FileType.CSV:
        case FileType.JSON: return React.createElement(Database, { ...commonProps, className: `${baseClassName} text-green-500` });
        case FileType.TXT:
        default: return React.createElement(FileIconLucide, { ...commonProps, className: `${baseClassName} text-slate-500` });
    }
};

export const calculateMovingAverage = (data: number[], windowSize: number): (number | null)[] => {
  if (windowSize <= 0) return data;
  const smoothed = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    if (window.length > 0) {
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      smoothed.push(avg);
    } else {
      smoothed.push(null);
    }
  }
  return smoothed;
};
