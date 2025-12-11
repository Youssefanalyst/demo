
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
} from 'recharts';
import Plotly from 'plotly.js-dist-min';
import { DashboardData, RowData, ChartType, ChartConfig } from '../types';
import { Lightbulb, Info, BarChart2, Filter, XCircle, Box, Pencil, Check, X } from 'lucide-react';

interface DashboardProps {
  data: DashboardData | null;
  rawData: RowData[];
  isLoading: boolean;
  onGenerate: () => void;
  onUpdateDescription: (chartId: string, newDesc: string) => void;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

// Simple wrapper for Plotly to work in React
const PlotlyChart = ({ data, layout, config, style }: any) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const plotInstance = useRef<any>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const updatePlot = async () => {
            if (containerRef.current) {
                if (!plotInstance.current) {
                    plotInstance.current = await Plotly.newPlot(containerRef.current, data, layout, config);
                } else {
                    Plotly.react(containerRef.current, data, layout, config);
                }
            }
        };
        updatePlot();

        const handleResize = () => {
           if (containerRef.current) {
               Plotly.Plots.resize(containerRef.current);
           }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (containerRef.current) {
                Plotly.purge(containerRef.current);
                plotInstance.current = null;
            }
        };
    }, [data, layout, config]);

    return <div ref={containerRef} style={style} />;
};

const Dashboard: React.FC<DashboardProps> = ({ data, rawData, isLoading, onGenerate, onUpdateDescription }) => {
  const [filterCol, setFilterCol] = useState<string>('');
  const [filterVal, setFilterVal] = useState<string>('');
  const [chartTypeOverrides, setChartTypeOverrides] = useState<Record<string, ChartType>>({});
  const [zAxisOverrides, setZAxisOverrides] = useState<Record<string, string>>({});
  
  // Interactive State
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, string[]>>({});
  const [activeIndices, setActiveIndices] = useState<Record<string, number | null>>({});

  // Editing State
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [tempDesc, setTempDesc] = useState('');

  // Extract columns from the first row of data
  const columns = useMemo(() => {
    if (rawData.length === 0) return [];
    return Object.keys(rawData[0]);
  }, [rawData]);

  // Get unique values for the selected filter column
  const uniqueValues = useMemo(() => {
    if (!filterCol) return [];
    const values = new Set(rawData.map(row => String(row[filterCol])));
    return Array.from(values).sort();
  }, [rawData, filterCol]);

  // Apply filter to data
  const filteredData = useMemo(() => {
    if (!filterCol || !filterVal) return rawData;
    return rawData.filter(row => String(row[filterCol]) === filterVal);
  }, [rawData, filterCol, filterVal]);

  const clearFilter = () => {
    setFilterCol('');
    setFilterVal('');
  };

  const getChartType = (chart: ChartConfig): ChartType => {
    return chartTypeOverrides[chart.id] || chart.type;
  };

  const getZAxis = (chart: ChartConfig) => {
      return zAxisOverrides[chart.id] || chart.zAxisKey || chart.dataKeys[0];
  };

  const toggleSeries = (chartId: string, dataKey: string) => {
    setHiddenSeries(prev => {
      const current = prev[chartId] || [];
      const isHidden = current.includes(dataKey);
      if (isHidden) {
        return { ...prev, [chartId]: current.filter(k => k !== dataKey) };
      } else {
        return { ...prev, [chartId]: [...current, dataKey] };
      }
    });
  };

  const toggleSelection = (chartId: string, index: number) => {
    setActiveIndices(prev => {
       const current = prev[chartId];
       return { ...prev, [chartId]: current === index ? null : index };
    });
  };

  const handleLegendClick = (chartId: string, e: any) => {
    const key = e.dataKey || e.value;
    if (key) {
      toggleSeries(chartId, String(key));
    }
  };

  const startEditing = (id: string, desc: string) => {
      setEditingDescId(id);
      setTempDesc(desc);
  };

  const saveEditing = (id: string) => {
      onUpdateDescription(id, tempDesc);
      setEditingDescId(null);
  };

  const cancelEditing = () => {
      setEditingDescId(null);
      setTempDesc('');
  };

  if (!data && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-lg border border-dashed border-gray-300">
        <div className="bg-brand-50 p-4 rounded-full mb-4">
          <BarChart2 size={48} className="text-brand-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Insights Yet</h3>
        <p className="text-gray-500 max-w-md mb-6">
          Generate an AI-powered dashboard to visualize your data, uncover trends, and get actionable insights instantly.
        </p>
        <button
          onClick={onGenerate}
          className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg shadow-sm transition-all flex items-center gap-2"
        >
          <Lightbulb size={18} /> Generate Dashboard
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mb-4"></div>
        <p className="text-gray-500 animate-pulse">Analyzing data and generating charts...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full overflow-auto custom-scrollbar p-6 space-y-6 bg-gray-50/50">
      
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Filter size={18} className="text-brand-500" />
          <span>Filter Data:</span>
        </div>
        
        <select 
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={filterCol}
          onChange={(e) => { setFilterCol(e.target.value); setFilterVal(''); }}
        >
          <option value="">Select Column...</option>
          {columns.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>

        <select 
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          value={filterVal}
          onChange={(e) => setFilterVal(e.target.value)}
          disabled={!filterCol}
        >
          <option value="">Select Value...</option>
          {uniqueValues.map(val => (
            <option key={val} value={val}>{val}</option>
          ))}
        </select>

        {filterCol && filterVal && (
          <button 
            onClick={clearFilter}
            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <XCircle size={16} /> Clear
          </button>
        )}
        
        {filterCol && filterVal && (
          <div className="ml-auto text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-900">{filteredData.length}</span> rows
          </div>
        )}
      </div>

      {/* Summary Section */}
      <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Info size={20} className="text-brand-500" /> Executive Summary
        </h2>
        <p className="text-gray-600 leading-relaxed">{data.summary}</p>
      </section>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.insights.map((insight, idx) => (
          <div key={idx} className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg shrink-0 mt-1">
                <Lightbulb size={18} className="text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Insight {idx + 1}</h4>
                <p className="text-sm text-gray-600">{insight}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        {data.charts.map((chart) => {
          const currentType = getChartType(chart);
          const currentZAxis = getZAxis(chart);
          const is3D = currentType === 'scatter3d';

          return (
            <div key={chart.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    {chart.title}
                    {is3D && (
                      <span title="3D Chart Active">
                        <Box size={16} className="text-brand-500" />
                      </span>
                    )}
                  </h3>
                  
                  {/* Editable Description */}
                  <div className="mt-1 min-h-[24px]"> 
                    {editingDescId === chart.id ? (
                        <div className="flex items-start gap-2 animate-in fade-in duration-200">
                             <textarea
                                autoFocus
                                className="w-full text-sm text-gray-700 border border-brand-300 rounded-md p-2 focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white shadow-sm resize-none"
                                value={tempDesc}
                                onChange={(e) => setTempDesc(e.target.value)}
                                rows={2}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        saveEditing(chart.id);
                                    }
                                    if (e.key === 'Escape') cancelEditing();
                                }}
                             />
                             <div className="flex flex-col gap-1">
                                 <button onClick={() => saveEditing(chart.id)} className="p-1 bg-green-50 text-green-600 hover:bg-green-100 rounded transition-colors" title="Save">
                                     <Check size={14} />
                                 </button>
                                 <button onClick={cancelEditing} className="p-1 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors" title="Cancel">
                                     <X size={14} />
                                 </button>
                             </div>
                        </div>
                    ) : (
                        <div className="group relative pr-6">
                            <p className="text-sm text-gray-500 leading-relaxed cursor-text" onClick={() => startEditing(chart.id, chart.description || '')}>
                                {chart.description || "No description provided."}
                            </p>
                            <button 
                                onClick={() => startEditing(chart.id, chart.description || '')}
                                className="absolute top-0 right-0 p-1 text-gray-400 hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                title="Edit Description"
                            >
                                <Pencil size={12} />
                            </button>
                        </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 self-start">
                  {/* Z-Axis Selector for 3D Charts */}
                  {is3D && (
                      <select
                        value={currentZAxis}
                        onChange={(e) => setZAxisOverrides(prev => ({ ...prev, [chart.id]: e.target.value }))}
                        className="text-xs font-medium border border-gray-200 rounded-md py-1.5 px-2 bg-gray-50 text-gray-600 focus:ring-2 focus:ring-brand-500 outline-none hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                        title="Select Z-Axis"
                      >
                         <option disabled value="">Z-Axis</option>
                         {columns.map(c => <option key={c} value={c}>Z: {c}</option>)}
                      </select>
                  )}

                  <select
                    value={currentType}
                    onChange={(e) => setChartTypeOverrides(prev => ({ ...prev, [chart.id]: e.target.value as ChartType }))}
                    className="text-xs font-medium border border-gray-200 rounded-md py-1.5 px-2 bg-gray-50 text-gray-600 focus:ring-2 focus:ring-brand-500 outline-none hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="area">Area Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="scatter">Scatter Plot</option>
                    <option value="scatter3d">3D Scatter</option>
                  </select>
                </div>
              </div>
              
              <div className="flex-1 w-full min-h-0 relative">
                {is3D ? (
                    <PlotlyChart
                        style={{ width: '100%', height: '100%' }}
                        data={[
                            {
                                x: filteredData.map(d => d[chart.xAxisKey]),
                                y: filteredData.map(d => d[chart.dataKeys[0]]),
                                z: filteredData.map(d => d[currentZAxis]),
                                mode: 'markers',
                                type: 'scatter3d',
                                marker: {
                                    size: 5,
                                    color: filteredData.map((_, i) => COLORS[i % COLORS.length]),
                                    opacity: 0.8
                                },
                                hovertemplate: `<b>${chart.xAxisKey}</b>: %{x}<br><b>${chart.dataKeys[0]}</b>: %{y}<br><b>${currentZAxis}</b>: %{z}<extra></extra>`
                            }
                        ]}
                        layout={{
                            margin: { l: 0, r: 0, b: 0, t: 0 },
                            scene: {
                                xaxis: { title: chart.xAxisKey },
                                yaxis: { title: chart.dataKeys[0] },
                                zaxis: { title: currentZAxis },
                                camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } }
                            },
                            autosize: true
                        }}
                        config={{ displayModeBar: false, responsive: true }}
                    />
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    const isSeriesHidden = (key: string) => (hiddenSeries[chart.id] || []).includes(key);
                    const activeIndex = activeIndices[chart.id];

                    switch (currentType) {
                      case 'bar':
                        return (
                          <BarChart data={filteredData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey={chart.xAxisKey} fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36} 
                                iconType="circle" 
                                onClick={(e) => handleLegendClick(chart.id, e)}
                                wrapperStyle={{ cursor: 'pointer' }}
                            />
                            {chart.dataKeys.map((key, i) => (
                              <Bar 
                                key={key} 
                                dataKey={key} 
                                name={key}
                                fill={chart.colors?.[i] || COLORS[i % COLORS.length]} 
                                radius={[4, 4, 0, 0]} 
                                hide={isSeriesHidden(key)}
                              />
                            ))}
                          </BarChart>
                        );
                      case 'line':
                        return (
                          <LineChart data={filteredData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey={chart.xAxisKey} fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36} 
                                iconType="plainline" 
                                onClick={(e) => handleLegendClick(chart.id, e)}
                                wrapperStyle={{ cursor: 'pointer' }}
                            />
                            {chart.dataKeys.map((key, i) => (
                              <Line 
                                key={key} 
                                type="monotone" 
                                dataKey={key} 
                                name={key}
                                stroke={chart.colors?.[i] || COLORS[i % COLORS.length]} 
                                strokeWidth={2} 
                                dot={{ r: 4 }} 
                                activeDot={{ r: 6 }} 
                                hide={isSeriesHidden(key)}
                              />
                            ))}
                          </LineChart>
                        );
                      case 'area':
                         return (
                          <AreaChart data={filteredData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey={chart.xAxisKey} fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36} 
                                iconType="rect" 
                                onClick={(e) => handleLegendClick(chart.id, e)}
                                wrapperStyle={{ cursor: 'pointer' }}
                            />
                            {chart.dataKeys.map((key, i) => (
                              <Area 
                                key={key} 
                                type="monotone" 
                                dataKey={key} 
                                name={key}
                                fill={chart.colors?.[i] || COLORS[i % COLORS.length]} 
                                stroke={chart.colors?.[i] || COLORS[i % COLORS.length]} 
                                fillOpacity={0.3} 
                                hide={isSeriesHidden(key)}
                              />
                            ))}
                          </AreaChart>
                        );
                      case 'pie':
                        return (
                          <PieChart>
                            <Pie
                              data={filteredData}
                              dataKey={chart.dataKeys[0]}
                              nameKey={chart.xAxisKey}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                            >
                              {filteredData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={COLORS[index % COLORS.length]} 
                                    fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                                    stroke={activeIndex === index ? '#000' : 'none'}
                                    strokeWidth={activeIndex === index ? 2 : 0}
                                    onClick={() => toggleSelection(chart.id, index)}
                                    cursor="pointer"
                                />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        );
                      case 'scatter':
                        return (
                          <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              type="category"
                              dataKey="x"
                              name={chart.xAxisKey}
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              type="number"
                              dataKey="y"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              cursor={{ strokeDasharray: '3 3' }}
                              contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                            {chart.dataKeys.map((key, i) => {
                              const seriesData = filteredData
                                .map((d) => {
                                  const xValue = d[chart.xAxisKey];
                                  const rawY = d[key];
                                  if (rawY === undefined || rawY === null || rawY === '') return null;

                                  const yNum =
                                    typeof rawY === 'number'
                                      ? rawY
                                      : parseFloat(String(rawY).replace(/,/g, ''));

                                  if (!Number.isFinite(yNum)) return null;

                                  return {
                                    x: String(xValue ?? ''),
                                    y: yNum,
                                  };
                                })
                                .filter((point): point is { x: string; y: number } => !!point);

                              if (seriesData.length === 0) {
                                return null;
                              }

                              return (
                                <Scatter
                                  key={key}
                                  name={key}
                                  data={seriesData}
                                  fill={chart.colors?.[i] || COLORS[i % COLORS.length]}
                                  line={false}
                                >
                                  {seriesData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={chart.colors?.[i] || COLORS[i % COLORS.length]}
                                      fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                                      onClick={() => toggleSelection(chart.id, index)}
                                      cursor="pointer"
                                    />
                                  ))}
                                </Scatter>
                              );
                            })}
                          </ScatterChart>
                        );
                      default:
                        return <div className="flex items-center justify-center h-full text-gray-400">Chart type not supported</div>;
                    }
                  })()}
                </ResponsiveContainer>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
