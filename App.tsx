import React, { useState, useEffect, useCallback } from 'react';
import { getFiles } from './services/fileService';
import type { FileItem } from './types';
import { useDebounce } from './hooks/useDebounce';
import Header from './components/Header';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const fetchFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedFiles = await getFiles();
      setFiles(fetchedFiles);
    } catch (err) {
      setError('Failed to fetch files.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);
  
  return (
    <div className="min-h-screen font-sans text-slate-800">
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard
          files={files}
          setFiles={setFiles}
          isLoading={isLoading}
          error={error}
          refreshFiles={fetchFiles}
          searchTerm={debouncedSearchTerm}
        />
      </main>
    </div>
  );
};

export default App;
