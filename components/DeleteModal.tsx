import React, { useEffect } from 'react';
import type { FileItem } from '../types';
import { AlertCircle } from 'lucide-react';

const DeleteModal: React.FC<{ file: FileItem; onClose: () => void; onDelete: () => void; }> = ({ file, onClose, onDelete }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-500" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Delete File</h3>
            <div className="mt-2 px-7 py-3">
                <p className="text-sm text-slate-500">
                Are you sure you want to delete <span className="font-semibold text-slate-800">{file.name}</span>? This action cannot be undone.
                </p>
            </div>
            <div className="flex justify-center gap-3 mt-4">
                <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 border border-transparent rounded-lg hover:bg-slate-200"
                >
                Cancel
                </button>
                <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700"
                >
                Delete
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;