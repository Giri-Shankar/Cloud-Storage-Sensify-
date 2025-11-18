import React from 'react';
import type { FileItem } from '../types';
import FileListItem from './FileListItem';

interface FileListProps {
  files: FileItem[];
  onRename: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
}

const FileList: React.FC<FileListProps> = ({ files, onRename, onDelete }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <ul role="list" className="divide-y divide-slate-200">
        <li className="hidden sm:grid grid-cols-12 gap-x-6 px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
          <div className="col-span-5">Name</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2">Sensor Type</div>
          <div className="col-span-2">Uploaded</div>
          <div className="col-span-1 text-right">Actions</div>
        </li>
        {files.map((file) => (
          <FileListItem key={file.id} file={file} onRename={onRename} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  );
};

export default FileList;