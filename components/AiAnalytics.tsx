import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { FileItem, Insight, DataPoint } from '../types';
import { SensorType, FileType } from '../types';
import { analyzeFileContent, generateDashboardInsights } from '../services/geminiService';
import { Brain, FileText, RefreshCw } from 'lucide-react';
import { Icon } from './icons/IconComponents';
import { calculateMovingAverage } from '../utils';

// Helper to generate more data for realistic charts from sparse source data
const generateChartData = (
  initialPoints: DataPoint[],
  numPoints: number = 140
): DataPoint[] => {
  if (initialPoints.length === 0) return [];
  const generated: DataPoint[] = [...initialPoints];
  const startTime = initialPoints[0]?.timestamp.getTime() || new Date().getTime() - 86400000;
  const endTime = new Date().getTime();
  const timeStep = (endTime - startTime) / numPoints;

  const getInitialValue = (key: keyof DataPoint) => {
    const point = initialPoints.find(p => p[key] !== undefined && p[key] !== null);
    return point ? (point[key] as number) : 0;
  };

  let lastTemp = getInitialValue('temperature') || 20;
  let lastHumidity = getInitialValue('humidity') || 50;
  let lastLight = getInitialValue('light') || 500;
  let lastAqi = getInitialValue('airQuality') || 40;
  
  if (initialPoints.length < numPoints) {
      for (let i = initialPoints.length; i < numPoints; i++) {
        const newTimestamp = new Date(startTime + i * timeStep);
        lastTemp += (Math.random() - 0.5) * 2;
        lastHumidity += (Math.random() - 0.5) * 5;
        lastLight += (Math.random() - 0.45) * 50;
        lastAqi += (Math.random() - 0.5) * 3;
        
        generated.push({
          timestamp: newTimestamp,
          temperature: Math.max(-10, Math.min(40, lastTemp)),
          humidity: Math.max(0, Math.min(100, lastHumidity)),
          light: Math.max(0, Math.min(1000, lastLight)),
          airQuality: Math.max(0, Math.min(200, lastAqi)),
        });
      }
  }
  return generated.sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
};

const inferSensorTypeFromContent = (content: string): SensorType => {
    const header = content.substring(0, 200).toLowerCase();
    if(header.includes('temp') && header.includes('hum')) return SensorType.DHT22;
    if(header.includes('light') || header.includes('ldr') || header.includes('intensity')) return SensorType.LDR;
    if(header.includes('air') || header.includes('aqi') || header.includes('mq135')) return SensorType.MQ135;
    if(header.includes('rain')) return SensorType.Rain;
    if(header.includes('soil') || header.includes('moisture')) return SensorType.Soil;
    return SensorType.None;
}

// --- SUB-COMPONENTS ---

const TimeSeriesChart = ({ data }: { data: DataPoint[] }) => {
  if (!data || data.length < 2) return <div className="h-64 flex items-center justify-center text-slate-400">Not enough data for chart.</div>;
  const colors = { temperature: 'text-red-400', humidity: 'text-blue-400', light: 'text-yellow-400', airQuality: 'text-green-400' };
  
  const createPath = (key: keyof Omit<DataPoint, 'timestamp'>, useMovingAverage = false, windowSize = 5) => {
    const points = data.map(d => d[key]).filter(v => typeof v === 'number') as number[];
    if (points.length < 2) return "";
    
    const valuesToPath = useMovingAverage ? calculateMovingAverage(points, windowSize) : points;
    
    const validPoints = valuesToPath.map((p, i) => ({ val: p, idx: i })).filter(p => p.val !== null);
    if (validPoints.length < 2) return "";

    const allNumericPoints = data.map(d => d[key]).filter(v => typeof v === 'number') as number[];
    const min = Math.min(...allNumericPoints), max = Math.max(...allNumericPoints);
    const range = max - min || 1;
    
    return validPoints.map((p, i) => {
      const x = (p.idx / (data.length - 1)) * 100;
      const y = 100 - (((p.val as number) - min) / range) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Sensor Readings Over Time</h3>
      <div className="h-64 relative">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          {Object.keys(colors).map(key => (
            <React.Fragment key={key}>
              <path d={createPath(key as keyof typeof colors)} fill="none" stroke="currentColor" className={`${colors[key as keyof typeof colors]} opacity-50`} strokeWidth="0.5" />
              <path d={createPath(key as keyof typeof colors, true)} fill="none" stroke="currentColor" className={colors[key as keyof typeof colors]} strokeWidth="1.5" />
            </React.Fragment>
          ))}
        </svg>
      </div>
      <div className="flex justify-center gap-4 mt-4 flex-wrap">
        {Object.keys(colors).map(key => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded-full bg-current ${colors[key as keyof typeof colors]}`}></div>
            <span className="capitalize text-slate-700">{key.replace('airQuality', 'Air Quality')}</span>
          </div>
        ))}
         <div className="flex items-center gap-2 text-sm text-slate-500"><div className="w-3 h-0.5 bg-current opacity-50"></div>Raw Data</div>
         <div className="flex items-center gap-2 text-sm text-slate-700"><div className="w-3 h-1 bg-current"></div>Moving Avg.</div>
      </div>
    </div>
  );
};

const DistributionHistogram = ({ data, metric, title, colorClass, unit }: { data: DataPoint[], metric: keyof Omit<DataPoint, 'timestamp'>, title: string, colorClass: string, unit: string }) => {
    const values = useMemo(() => data.map(d => d[metric]).filter(v => typeof v === 'number') as number[], [data, metric]);
    const { bins, min, max, binSize } = useMemo(() => {
        if (values.length < 2) return { bins: [], min: 0, max: 0, binSize: 0 };
        const min = Math.min(...values);
        const max = Math.max(...values);
        const numBins = 15;
        const binSize = (max - min) / numBins || 1;
        const bins = Array(numBins).fill(0);
        values.forEach(v => {
            const binIndex = Math.min(Math.floor((v - min) / binSize), numBins - 1);
            if(bins[binIndex] !== undefined) bins[binIndex]++;
        });
        return { bins, min, max, binSize };
    }, [values]);

    if (bins.length === 0) return null;
    const maxFreq = Math.max(...bins);
    
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-2 text-sm">{title} Distribution</h4>
            <div className="flex items-end h-24 gap-[2px]">
                {bins.map((freq, i) => (
                    <div key={i} className={`w-full rounded-t-sm ${colorClass} transition-all duration-300 hover:opacity-100 opacity-70`} style={{ height: `${(freq / maxFreq) * 100}%` }} 
                         title={`${(min + i * binSize).toFixed(1)} - ${(min + (i + 1) * binSize).toFixed(1)} ${unit}: ${freq} readings`} 
                    />
                ))}
            </div>
        </div>
    );
};

const DayNightComparison = ({ data }: { data: DataPoint[] }) => {
    const { dayAvgs, nightAvgs } = useMemo(() => {
        const dayReadings: { [key in keyof Omit<DataPoint, 'timestamp'>]: number[] } = { temperature: [], humidity: [], light: [], airQuality: [] };
        const nightReadings: { [key in keyof Omit<DataPoint, 'timestamp'>]: number[] } = { temperature: [], humidity: [], light: [], airQuality: [] };

        data.forEach(d => {
            const hour = d.timestamp.getHours();
            const bucket = (hour >= 6 && hour < 18) ? dayReadings : nightReadings;
            Object.keys(bucket).forEach(key => {
                const metric = key as keyof typeof bucket;
                if (d[metric] !== undefined && d[metric] !== null) bucket[metric].push(d[metric] as number);
            });
        });
        
        const calcAvg = (arr: number[]) => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : null;
        
        return {
            dayAvgs: {
                temperature: calcAvg(dayReadings.temperature), humidity: calcAvg(dayReadings.humidity),
                light: calcAvg(dayReadings.light), airQuality: calcAvg(dayReadings.airQuality)
            },
            nightAvgs: {
                temperature: calcAvg(nightReadings.temperature), humidity: calcAvg(nightReadings.humidity),
                light: calcAvg(nightReadings.light), airQuality: calcAvg(nightReadings.airQuality)
            }
        };
    }, [data]);
    
    const renderRow = (metric: string, unit: string, dayValue: number | null, nightValue: number | null) => {
        if (dayValue === null && nightValue === null) return null;
        const diff = dayValue !== null && nightValue !== null ? dayValue - nightValue : null;
        return (
            <div key={metric} className="grid grid-cols-3 gap-4 text-center py-2 border-b border-slate-200 last:border-b-0">
                <div className="font-medium text-slate-700 text-left">{metric}</div>
                <div className="text-slate-800">{dayValue?.toFixed(1) ?? 'N/A'} <span className="text-slate-400">{unit}</span></div>
                <div className="text-slate-800">{nightValue?.toFixed(1) ?? 'N/A'} <span className="text-slate-400">{unit}</span></div>
            </div>
        )
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Day vs. Night Averages</h3>
            <div className="grid grid-cols-3 gap-4 text-center text-sm font-semibold text-slate-500 mb-2">
                <div className="text-left">Metric</div>
                <div className="flex items-center justify-center gap-1"><Icon.Sunrise className="w-4 h-4 text-yellow-400" /> Day</div>
                <div className="flex items-center justify-center gap-1"><Icon.Sunset className="w-4 h-4 text-indigo-400" /> Night</div>
            </div>
            {renderRow('Temperature', '°C', dayAvgs.temperature, nightAvgs.temperature)}
            {renderRow('Humidity', '%', dayAvgs.humidity, nightAvgs.humidity)}
            {renderRow('Light', 'lux', dayAvgs.light, nightAvgs.light)}
            {renderRow('Air Quality', 'AQI', dayAvgs.airQuality, nightAvgs.airQuality)}
        </div>
    );
};

// --- MAIN COMPONENT ---
const AiAnalytics: React.FC<{ files: FileItem[]; setFiles: React.Dispatch<React.SetStateAction<FileItem[]>> }> = ({ files, setFiles }) => {
  const sensorFiles = useMemo(() => files.filter(f => f.sensorType !== SensorType.None || f.type === FileType.CSV), [files]);
  const [selectedFileId, setSelectedFileId] = useState<string>(sensorFiles[0]?.id || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isInsightsLoading, setIsInsightsLoading] = useState<boolean>(false);
  const [dashboardData, setDashboardData] = useState<DataPoint[] | null>(null);

  const [prompt, setPrompt] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(false);

  const parseSensorData = useCallback((file: FileItem): DataPoint[] => {
    const points: DataPoint[] = [];
    try {
        if (file.type === FileType.CSV) {
            const lines = file.content.trim().split('\n');
            const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
            const getIndex = (keys: string[]) => keys.reduce((idx, key) => idx > -1 ? idx : header.findIndex(h => h.includes(key)), -1);
            
            const idxMap = {
                timestamp: getIndex(['timestamp', 'date', 'time']),
                temperature: getIndex(['temp']),
                humidity: getIndex(['hum']),
                light: getIndex(['light', 'lux', 'intensity']),
                airQuality: getIndex(['air', 'aqi', 'quality'])
            };

            if (idxMap.timestamp === -1) {
                console.error("No timestamp column found in CSV");
                return [];
            }

            lines.slice(1).forEach(line => {
                const values = line.split(',');
                const point: DataPoint = { timestamp: new Date(values[idxMap.timestamp]) };
                if (idxMap.temperature > -1) point.temperature = parseFloat(values[idxMap.temperature]);
                if (idxMap.humidity > -1) point.humidity = parseFloat(values[idxMap.humidity]);
                if (idxMap.light > -1) point.light = parseFloat(values[idxMap.light]);
                if (idxMap.airQuality > -1) point.airQuality = parseFloat(values[idxMap.airQuality]);
                if (Object.keys(point).length > 1) points.push(point);
            });
        }
    } catch (error) {
        console.error("Failed to parse file content:", error);
    }
    return points;
  }, []);

  const selectedFile = useMemo(() => files.find(f => f.id === selectedFileId), [files, selectedFileId]);
  
  const ANOMALY_THRESHOLDS = {
      temperature: { min: 0, max: 35 },
      humidity: { min: 20, max: 80 },
      airQuality: { min: 0, max: 100 }
  };

  const metrics = useMemo(() => {
    if (!dashboardData || dashboardData.length === 0) return null;
    const latest = dashboardData[dashboardData.length - 1];
    const prev = dashboardData[dashboardData.length - 2] || latest;
    
    const getMetric = (key: keyof Omit<DataPoint, 'timestamp'>, precision = 1) => {
        if (latest[key] === undefined || latest[key] === null) return null;
        
        const thresholds = ANOMALY_THRESHOLDS[key as keyof typeof ANOMALY_THRESHOLDS];
        const isAnomaly = thresholds && (latest[key]! < thresholds.min || latest[key]! > thresholds.max);

        const anomalies = dashboardData.filter(d => {
            if (d[key] === undefined || d[key] === null) return false;
            return thresholds && (d[key]! < thresholds.min || d[key]! > thresholds.max);
        }).length;
        
        return {
            value: (latest[key] as number).toFixed(precision),
            change: ((latest[key] as number) - (prev[key] as number)).toFixed(precision),
            anomalies,
            isAnomaly,
            anomalyPercent: ((anomalies / dashboardData.length) * 100).toFixed(0),
        };
    };

    return {
        temperature: getMetric('temperature'),
        humidity: getMetric('humidity', 0),
        light: getMetric('light', 0),
        airQuality: getMetric('airQuality', 0),
    };
  }, [dashboardData]);


  const generateNewInsights = useCallback(async (file: FileItem) => {
      setIsInsightsLoading(true);
      setInsights([]);
      const parsed = parseSensorData(file);
      const dataForCharts = generateChartData(parsed);
      setDashboardData(dataForCharts);
      
      if (dataForCharts.length > 0) {
        const latestPoint = dataForCharts[dataForCharts.length - 1];
        const dataSummary = `
          File: ${file.name} (${file.type}, ${file.sensorType})
          Data points: ${dataForCharts.length}
          Latest readings:
          - Temperature: ${latestPoint.temperature?.toFixed(1)}°C
          - Humidity: ${latestPoint.humidity?.toFixed(1)}%
          - Light: ${latestPoint.light?.toFixed(0)} lux
          - Air Quality: ${latestPoint.airQuality?.toFixed(0)} AQI
        `;

        const result = await generateDashboardInsights(dataSummary);
        setInsights(result);
      }
      setIsInsightsLoading(false);
  }, [parseSensorData]);

  useEffect(() => {
    if (selectedFile) {
        generateNewInsights(selectedFile);
    } else if (sensorFiles.length > 0 && !selectedFileId) {
        setSelectedFileId(sensorFiles[0].id);
    }
  }, [selectedFileId, selectedFile, sensorFiles, generateNewInsights]);

  // FIX: Explicitly type 'file' as 'File' to resolve 'unknown' type errors when handling file uploads.
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    const newFileItems: FileItem[] = [];
    Array.from(uploadedFiles).forEach((file: File, index) => {
        if(file.type === 'text/csv' || file.name.endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                const newFile: FileItem = {
                    id: `uploaded-${Date.now()}-${file.name}`,
                    name: file.name,
                    size: file.size,
                    uploadedAt: new Date().toISOString(),
                    modifiedAt: new Date().toISOString(),
                    type: FileType.CSV,
                    sensorType: inferSensorTypeFromContent(content),
                    content,
                };
                newFileItems.push(newFile);
                
                if (index === uploadedFiles.length - 1) {
                   setFiles(prev => [...prev, ...newFileItems]);
                   // Select the first of the newly uploaded files
                   setSelectedFileId(newFileItems[0].id);
                }
            };
            reader.readAsText(file);
        }
    });
    // Reset file input
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  // FIX: Implemented function to handle manual file analysis requests.
  const handleAnalyze = async () => {
    if (!selectedFile || !prompt) return;
    setIsAnalysisLoading(true);
    setAnalysisResult('');
    try {
      const result = await analyzeFileContent(
        selectedFile.name,
        selectedFile.content,
        prompt
      );
      setAnalysisResult(result);
    } catch (error) {
      console.error("Failed to analyze file:", error);
      setAnalysisResult("An error occurred during analysis.");
    } finally {
      setIsAnalysisLoading(false);
    }
  };
  const formattedResult = analysisResult.replace(/\n/g, '<br />'); // Simplified for brevity

  // FIX: Implemented component to render AI-powered insight cards.
  const renderInsightCard = (insight: Insight, index: number) => {
    const iconMap = {
      critical: <Icon.AlertTriangle className="w-6 h-6 text-red-500" />,
      warning: <Icon.AlertTriangle className="w-6 h-6 text-yellow-500" />,
      info: <Icon.Info className="w-6 h-6 text-blue-500" />,
    };
    const colorMap = {
      critical: 'border-red-300 bg-red-50',
      warning: 'border-yellow-300 bg-yellow-50',
      info: 'border-blue-300 bg-blue-50',
    };
    
    return (
      <div key={index} className={`p-6 rounded-2xl border ${colorMap[insight.level]} flex gap-4`}>
        <div className="flex-shrink-0">{iconMap[insight.level]}</div>
        <div>
          <h4 className="font-bold text-slate-900 mb-1">{insight.title}</h4>
          <p className="text-sm text-slate-500 mb-3">{insight.description}</p>
          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">{insight.recommendation}</p>
        </div>
      </div>
    );
  };

  const renderMetricCard = (title: string, unit: string, metric: any, icon: React.ReactNode) => {
      if (!metric) return <div className="bg-white p-4 rounded-xl border border-slate-200 animate-pulse min-h-[140px]"></div>;
      const isUp = parseFloat(metric.change) >= 0;
      const cardBorder = metric.isAnomaly ? 'border-red-400' : 'border-slate-200';
      const cardBg = metric.isAnomaly ? 'bg-red-50' : 'bg-white';

      return (
          <div className={`${cardBg} p-4 rounded-xl border ${cardBorder} transition-colors`}>
              <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-slate-700">{title}</h4>
                  <div className={`p-1.5 rounded-full ${metric.isAnomaly ? 'bg-red-500/20' : ''}`}>
                    {metric.isAnomaly && <Icon.AlertTriangle className="w-5 h-5 text-red-500"/>}
                    {!metric.isAnomaly && icon}
                  </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{metric.value}<span className="text-xl text-slate-500 ml-1">{unit}</span></p>
              <div className="flex items-center text-sm mt-2">
                  {isUp ? <Icon.TrendingUp className="w-4 h-4 text-green-500"/> : <Icon.TrendingDown className="w-4 h-4 text-red-500"/>}
                  <span className={`ml-1 font-medium ${isUp ? 'text-green-500' : 'text-red-500'}`}>{metric.change}</span>
                  <span className="text-slate-400 ml-2">vs last</span>
              </div>
              {metric.anomalies > 0 && <p className="text-xs text-yellow-500 mt-1">{metric.anomalies} anomalies ({metric.anomalyPercent}%) detected</p>}
          </div>
      )
  };

  if (sensorFiles.length === 0) {
    return (
       <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
         <div className="inline-block p-6 bg-slate-100 rounded-full mb-4 border border-slate-200">
           <FileText className="w-12 h-12 text-slate-400" />
         </div>
         <h3 className="text-2xl font-semibold text-slate-800 mb-2">No Sensor Data Files Found</h3>
         <p className="text-slate-500 mb-4">Upload a sensor data file (CSV) to see the dashboard.</p>
          <input type="file" id="file-upload-empty" ref={fileInputRef} multiple accept=".csv" onChange={handleFileChange} className="hidden" />
          <label htmlFor="file-upload-empty" className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            <Icon.UploadCloud className="w-5 h-5"/> Upload CSV
          </label>
       </div>
    );
  }

  return (
    <div className="space-y-8">
       <div className="bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-900">Sensor Dashboard</h2>
           {selectedFile ? (
            <p className="text-sm text-slate-500">
              <select 
                value={selectedFileId}
                onChange={e => setSelectedFileId(e.target.value)}
                className="bg-transparent font-medium text-blue-600 focus:outline-none focus:ring-0 border-0 p-0 mr-2 appearance-none"
                aria-label="Select data source"
              >
                  {sensorFiles.map(f => <option key={f.id} value={f.id} className="bg-white text-slate-800">{f.name}</option>)}
              </select>
              | {dashboardData?.length || 0} data points
            </p>
            ) : <p className="text-sm text-slate-400">Select a file to begin.</p>}
        </div>
        <div className="flex items-center gap-2">
            <input type="file" id="file-upload" ref={fileInputRef} multiple accept=".csv" onChange={handleFileChange} className="hidden" />
            <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                <Icon.UploadCloud className="w-4 h-4"/> Upload CSV
            </label>
            <button 
               onClick={() => selectedFile && generateNewInsights(selectedFile)}
               disabled={isInsightsLoading}
               className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              <RefreshCw className={`w-4 h-4 ${isInsightsLoading ? 'animate-spin' : ''}`} />
            </button>
        </div>
       </div>
      
       <div>
         <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2"><Brain className="w-5 h-5 text-blue-500" /> AI-Powered Insights</h3>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isInsightsLoading ? (
               Array.from({length: 4}).map((_, i) => <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 min-h-[180px] animate-pulse"></div>)
            ) : ( insights.length > 0 ? insights.map((insight, i) => renderInsightCard(insight, i)) : <p className="text-slate-400 lg:col-span-2 text-center py-8">No insights generated. Try reloading the data.</p>
            )}
         </div>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderMetricCard("Temperature", "°C", metrics?.temperature, <Icon.Thermometer className="w-6 h-6 text-slate-500"/>)}
          {renderMetricCard("Humidity", "%", metrics?.humidity, <Icon.Droplets className="w-6 h-6 text-slate-500"/>)}
          {renderMetricCard("Light", "lux", metrics?.light, <Icon.Sun className="w-6 h-6 text-slate-500"/>)}
          {renderMetricCard("Air Quality", "AQI", metrics?.airQuality, <Icon.Wind className="w-6 h-6 text-slate-500"/>)}
       </div>

       {dashboardData && <TimeSeriesChart data={dashboardData} />}

        {dashboardData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DayNightComparison data={dashboardData} />
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">Data Distributions</h3>
                    <DistributionHistogram data={dashboardData} metric="temperature" title="Temperature" colorClass="bg-red-500" unit="°C" />
                    <DistributionHistogram data={dashboardData} metric="humidity" title="Humidity" colorClass="bg-blue-500" unit="%" />
                    <DistributionHistogram data={dashboardData} metric="light" title="Light" colorClass="bg-yellow-500" unit="lux" />
                    <DistributionHistogram data={dashboardData} metric="airQuality" title="Air Quality" colorClass="bg-green-500" unit="AQI" />
                </div>
            </div>
        )}

      <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mt-8">
        <h3 className="text-xl font-semibold text-slate-800 mb-1">Analyze a File Manually</h3>
        <p className="text-slate-500 mb-6">Ask a specific question about the currently selected dataset.</p>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., What was the average temperature yesterday? Correlate humidity and light levels."
          className="block w-full rounded-lg border-slate-300 bg-slate-100 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm placeholder:text-slate-400 mb-4"
        />
        <button
          onClick={handleAnalyze}
          disabled={isAnalysisLoading || !selectedFileId || !prompt}
          className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalysisLoading ? 'Analyzing...' : 'Generate Analysis'}
        </button>

        {(isAnalysisLoading || analysisResult) && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Analysis Result</h3>
            {isAnalysisLoading ? (
                 <div className="bg-slate-100 p-4 rounded-md text-sm text-slate-500 animate-pulse">
                    <p>Generating insights with Gemini... Please wait.</p>
                 </div>
            ) : (
                <div className="bg-slate-100 p-4 rounded-md text-sm text-slate-700 prose prose-sm max-w-none prose-strong:text-slate-900" dangerouslySetInnerHTML={{ __html: formattedResult }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAnalytics;