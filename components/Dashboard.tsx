import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { FileItem, ViewMode, SortOption, FilterType } from '../types';
import { SensorType, FileType } from '../types';
import { Search, Filter, LayoutGrid, List, ChevronDown, Wind, UploadCloud } from 'lucide-react';
import FileGrid from './FileGrid';
import FileList from './FileList';
import RenameModal from './RenameModal';
import DeleteModal from './DeleteModal';
import { renameFile, deleteFile, uploadFile } from '../services/fileService';


interface DashboardProps {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  isLoading: boolean;
  error: string | null;
  refreshFiles: () => void;
  searchTerm: string;
}

const Dashboard: React.FC<DashboardProps> = ({ files, setFiles, isLoading, error, refreshFiles, searchTerm }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);
  const [deletingFile, setDeletingFile] = useState<FileItem | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAndSortedFiles = useMemo(() => {
    let processedFiles = [...files];

    if (searchTerm) {
      processedFiles = processedFiles.filter((file) =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
        const isSensor = Object.values(SensorType).includes(filterType as SensorType);
        processedFiles = processedFiles.filter(file => 
            isSensor ? file.sensorType === filterType : file.type === filterType
        );
    }

    switch (sortOption) {
      case 'latest':
        processedFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        break;
      case 'oldest':
        processedFiles.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
        break;
      case 'recently-modified':
        processedFiles.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
        break;
      case 'name-asc':
        processedFiles.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return processedFiles;
  }, [files, searchTerm, filterType, sortOption]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
        await uploadFile(file);
        refreshFiles();
    } catch (err) {
        console.error("Failed to upload file:", err);
        // You might want to show a toast notification here
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const handleRename = async (newName: string) => {
    if (!renamingFile) return;
    try {
        await renameFile(renamingFile, newName);
        refreshFiles();
    } catch (error) {
        console.error("Failed to rename file:", error);
    } finally {
        setRenamingFile(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingFile) return;
    try {
        await deleteFile(deletingFile);
        refreshFiles();
    } catch (error) {
        console.error("Failed to delete file:", error);
    } finally {
        setDeletingFile(null);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center text-slate-500 mt-16 flex flex-col items-center"><Wind className="w-10 h-10 animate-spin mb-4" /><p>Loading your files from Cloudinary...</p></div>;
    }
    if (error) {
      return <div className="text-center text-red-500 mt-16">{error}</div>;
    }
    if (filteredAndSortedFiles.length === 0) {
      return (
         <div className="text-center py-16">
            <div className="inline-block p-6 bg-slate-100 rounded-full mb-4 border border-slate-200">
              <Search className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No files found</h3>
            <p className="text-slate-500">Try adjusting your search or filters, or upload a new file.</p>
          </div>
      );
    }
    return viewMode === 'grid' ? (
      <FileGrid files={filteredAndSortedFiles} onRename={setRenamingFile} onDelete={setDeletingFile} />
    ) : (
      <FileList files={filteredAndSortedFiles} onRename={setRenamingFile} onDelete={setDeletingFile} />
    );
  };
  
  const sortOptions = [
      { label: 'Latest', value: 'latest' },
      { label: 'Oldest', value: 'oldest' },
  ];
  
  const handleFilterOrSort = (type: 'filter' | 'sort', value: string) => {
      if (type === 'sort') {
          setSortOption(value as SortOption);
      } else {
          setFilterType(value as FilterType);
      }
      setIsFilterOpen(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl border border-transparent hover:bg-blue-700 transition-colors font-medium disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isUploading ? <Wind className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
          <div className="relative" ref={filterRef}>
             <button onClick={() => setIsFilterOpen(!isFilterOpen)} aria-label="Filter and sort" className="flex items-center gap-2 bg-white text-slate-700 px-3 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 transition-colors font-medium">
                <Filter className="h-5 w-5"/>
                <ChevronDown className={`h-5 w-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}/>
             </button>
             {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-slate-200 focus:outline-none z-10 p-2 border border-slate-200">
                   <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase">Sort By</div>
                   {sortOptions.map(opt => (
                       <button key={opt.value} onClick={() => handleFilterOrSort('sort', opt.value)} className={`text-left w-full px-2 py-1.5 text-sm rounded-md ${sortOption === opt.value ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                           {opt.label}
                       </button>
                   ))}
                   <div className="border-t border-slate-200 my-2"></div>
                   <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase">Sensor Type</div>
                   <button onClick={() => handleFilterOrSort('filter', 'all')} className={`text-left w-full px-2 py-1.5 text-sm rounded-md ${filterType === 'all' ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>All Sensors</button>
                   {Object.values(SensorType).filter(s => s !== SensorType.None).map(s => (
                       <button key={s} onClick={() => handleFilterOrSort('filter', s)} className={`text-left w-full px-2 py-1.5 text-sm rounded-md ${filterType === s ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                           {s}
                       </button>
                   ))}
                   <div className="border-t border-slate-200 my-2"></div>
                   <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase">File Type</div>
                   {Object.values(FileType).map(ft => (
                       <button key={ft} onClick={() => handleFilterOrSort('filter', ft)} className={`text-left w-full px-2 py-1.5 text-sm rounded-md ${filterType === ft ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                           {ft}
                       </button>
                   ))}
                </div>
             )}
          </div>
          
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      
      <div>{renderContent()}</div>

      {renamingFile && (
        <RenameModal
          file={renamingFile}
          onClose={() => setRenamingFile(null)}
          onRename={handleRename}
        />
      )}
      {deletingFile && (
        <DeleteModal
          file={deletingFile}
          onClose={() => setDeletingFile(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default Dashboard;