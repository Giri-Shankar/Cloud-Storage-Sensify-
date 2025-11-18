import React, { useState, useEffect } from 'react';
import type { FileItem } from '../types';

const RenameModal: React.FC<{ file: FileItem; onClose: () => void; onRename: (newName: string) => void; }> = ({ file, onClose, onRename }) => {
  const [newName, setNewName] = useState(file.name);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onRename(newName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 transition-opacity" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
         <div className="p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Rename File</h3>
            <p className="text-sm text-slate-500 mb-6">Enter a new name for <span className="font-medium text-slate-700">{file.name}</span></p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6 text-slate-900"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 border border-transparent rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
                >
                  Rename
                </button>
              </div>
            </form>
         </div>
      </div>
    </div>
  );
};

export default RenameModal;