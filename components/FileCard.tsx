import React, { useState } from 'react';
import type { FileItem } from '../types';
import FileActionsMenu from './FileActionsMenu';
import { formatBytes, formatDate, getFileIcon } from '../utils';
import { SensorType } from '../types';

interface FileCardProps {
  file: FileItem;
  onRename: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onRename, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 hover:-translate-y-1 transition-all group flex flex-col">
      <div className="flex items-start justify-between mb-4">
        {getFileIcon(file.type)}
        <FileActionsMenu
          file={file}
          onRename={onRename}
          onDelete={onDelete}
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
        />
      </div>
      <div className="flex-grow">
        <h3 className="font-semibold text-slate-800 mb-2 truncate" title={file.name}>{file.name}</h3>
        <div className="space-y-1 text-sm text-slate-500">
          <p>Size: {formatBytes(file.size)}</p>
          <p>Uploaded: {formatDate(file.uploadedAt)}</p>
        </div>
      </div>
      {file.sensorType !== SensorType.None && (
        <div className="mt-4 pt-4 border-t border-slate-200">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {file.sensorType}
            </span>
        </div>
      )}
    </div>
  );
};

export default FileCard;