import React, { useRef, useEffect } from 'react';
import type { FileItem } from '../types';
import { MoreVertical } from 'lucide-react';

interface FileActionsMenuProps {
  file: FileItem;
  onRename: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const FileActionsMenu: React.FC<FileActionsMenuProps> = ({ file, onRename, onDelete, isOpen, setIsOpen }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsOpen]);

  const handleRenameClick = () => {
    onRename(file);
    setIsOpen(false);
  };

  const handleDeleteClick = () => {
    onDelete(file);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div>
        <button
          onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen)
          }}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500"
        >
          <span className="sr-only">Open options</span>
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20 border border-slate-200"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-2" role="none">
            <button
              onClick={handleRenameClick}
              className="text-slate-700 block px-4 py-2 text-sm w-full text-left hover:bg-slate-100"
              role="menuitem"
            >
              Rename
            </button>
            <button
              onClick={handleDeleteClick}
              className="text-red-600 block px-4 py-2 text-sm w-full text-left hover:bg-red-50"
              role="menuitem"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileActionsMenu;