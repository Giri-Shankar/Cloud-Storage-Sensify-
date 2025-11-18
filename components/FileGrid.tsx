
import React from 'react';
import type { FileItem } from '../types';
import FileCard from './FileCard';

interface FileGridProps {
  files: FileItem[];
  onRename: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
}

const FileGrid: React.FC<FileGridProps> = ({ files, onRename, onDelete }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {files.map((file) => (
        <FileCard key={file.id} file={file} onRename={onRename} onDelete={onDelete} />
      ))}
    </div>
  );
};

export default FileGrid;
