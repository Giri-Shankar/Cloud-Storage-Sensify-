import React, { useState } from 'react';
import type { FileItem } from '../types';
import FileActionsMenu from './FileActionsMenu';
import { formatBytes, formatDate, getFileIcon } from '../utils';
import { SensorType } from '../types';

interface FileListItemProps {
  file: FileItem;
  onRename: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
}

const FileListItem: React.FC<FileListItemProps> = ({ file, onRename, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <li className="hover:bg-slate-50/50 transition-colors duration-200">
      <div className="grid grid-cols-12 gap-x-6 px-6 py-4 text-sm items-center">
        <div className="col-span-5 flex items-center gap-4">
            {getFileIcon(file.type)}
            <span className="font-medium text-slate-800 truncate" title={file.name}>{file.name}</span>
        </div>
        <div className="col-span-2 text-slate-500">{formatBytes(file.size)}</div>
        <div className="col-span-2 text-slate-500">
            {file.sensorType !== SensorType.None ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {file.sensorType}
                </span>
            ) : <span className="text-slate-400">-</span>}
        </div>
        <div className="col-span-2 text-slate-500">{formatDate(file.uploadedAt)}</div>
        <div className="col-span-1 flex justify-end items-center">
          <FileActionsMenu
            file={file}
            onRename={onRename}
            onDelete={onDelete}
            isOpen={isMenuOpen}
            setIsOpen={setIsMenuOpen}
          />
        </div>
      </div>
    </li>
  );
};

export default FileListItem;