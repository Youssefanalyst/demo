import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  RadialBarChart,
  RadialBar,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  Treemap,
} from 'recharts';
import Plotly from 'plotly.js-dist-min';
import { SpreadsheetState, ColumnType } from '../types';
import { GripVertical, Trash2, BarChart2, Plus } from 'lucide-react';

interface ManualDashboardProps {
  data: SpreadsheetState;
}

type WidgetType =
  | 'bar'
  | 'column'
  | 'grouped'
  | 'stacked'
  | 'radar'
  | 'histogram'
  | 'violin'
  | 'violinHorizontal'
  | 'stackedArea'
  | 'bubble'
  | 'scatter'
  | 'line'
  | 'area'
  | 'gauge'
  | 'progress'
  | 'donut'
  | 'pie'
  | 'treemap'
  | 'choropleth'
  | 'bubbleMap'
  | 'text';

interface Widget {
  id: string;
  title: string;
  type: WidgetType;
  xKey?: string;
  yKey?: string;
  sizeKey?: string;
  seriesKeys?: string[];
  content?: string;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

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

const ManualDashboard: React.FC<ManualDashboardProps> = ({ data }) => {
  const columns = data.columns;
  const columnTypes = data.columnTypes as Record<string, ColumnType>;

  const numericColumns = useMemo(
    () => columns.filter((col) => columnTypes[col] === 'number'),
    [columns, columnTypes],
  );

  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [newType, setNewType] = useState<WidgetType>('bar');
  const [newX, setNewX] = useState<string>('');
  const [newY, setNewY] = useState<string>('');
  const [newSize, setNewSize] = useState<string>('');
  const [newSeries, setNewSeries] = useState<string[]>([]);

  useEffect(() => {
    if (!columns.length) return;
    if (!newX) setNewX(columns[0]);
    if (!newY) {
      const numeric = numericColumns[0];
      setNewY(numeric || columns[0]);
    }
    if (!newSize) {
      const numericAlt = numericColumns[1] || numericColumns[0];
      setNewSize(numericAlt || columns[0]);
    }
  }, [columns, numericColumns, newX, newY, newSize]);

  const handleAddWidget = () => {
    const id = Date.now().toString();

    if (newType === 'text') {
      const widget: Widget = {
        id,
        title: 'Text',
        type: 'text',
        content: '',
      };
      setWidgets((prev) => [...prev, widget]);
      return;
    }

    if (newType === 'histogram') {
      if (!columns.length || !newY) return;
      const widget: Widget = {
        id,
        title: `Histogram of ${newY}`,
        type: 'histogram',
        seriesKeys: [newY],
      };
      setWidgets((prev) => [...prev, widget]);
      return;
    }

    if (newType === 'violin' || newType === 'violinHorizontal') {
      if (!columns.length || !newY) return;
      const widget: Widget = {
        id,
        title:
          newType === 'violin'
            ? `Violin of ${newY}`
            : `Violin Horizontal of ${newY}`,
        type: newType,
        seriesKeys: [newY],
      };
      setWidgets((prev) => [...prev, widget]);
      return;
    }

    if (newType === 'gauge') {
      if (!columns.length || !newY) return;
      const widget: Widget = {
        id,
        title: `Gauge of ${newY}`,
        type: 'gauge',
        seriesKeys: [newY],
      };
      setWidgets((prev) => [...prev, widget]);
      return;
    }

    if (newType === 'progress') {
      if (!columns.length || !newY) return;
      const widget: Widget = {
        id,
        title: `Progress of ${newY}`,
        type: 'progress',
        seriesKeys: [newY],
      };
      setWidgets((prev) => [...prev, widget]);
      return;
    }

    if (newType === 'grouped' || newType === 'stacked' || newType === 'radar' || newType === 'stackedArea') {
      if (!columns.length || !newX) return;
      const available = numericColumns.length ? numericColumns : columns;
      const series = (newSeries.length ? newSeries : available).slice();
      if (!series.length) return;
      const widget: Widget = {
        id,
        title:
          newType === 'grouped'
            ? `Grouped Bar ${series.join(', ')} by ${newX}`
            : newType === 'stacked'
            ? `Stacked Bar ${series.join(', ')} by ${newX}`
            : newType === 'radar'
            ? `Radar ${series.join(', ')} by ${newX}`
            : `Stacked Area ${series.join(', ')} by ${newX}`,
        type: newType,
        xKey: newX,
        seriesKeys: series,
      };
      setWidgets((prev) => [...prev, widget]);
      return;
    }

    if (newType === 'bubble') {
      if (!columns.length || !newX || !newY || !newSize) return;
      const widget: Widget = {
        id,
        title: `BUBBLE ${newY} by ${newX} (size: ${newSize})`,
        type: 'bubble',
        xKey: newX,
        yKey: newY,
        sizeKey: newSize,
      };
      setWidgets((prev) => [...prev, widget]);
      return;
    }

    if (!columns.length || !newX || !newY) return;

    const widget: Widget = {
      id,
      title: `${newType.toUpperCase()} ${newY} by ${newX}`,
      type: newType,
      xKey: newX,
      yKey: newY,
    };
    setWidgets((prev) => [...prev, widget]);
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  };

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    setWidgets((prev) => {
      const currentIndex = prev.findIndex((w) => w.id === draggingId);
      const targetIndex = prev.findIndex((w) => w.id === targetId);
      if (currentIndex === -1 || targetIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const buildChartData = (widget: Widget) => {
    if (
      widget.type === 'histogram' ||
      widget.type === 'violin' ||
      widget.type === 'violinHorizontal'
    ) {
      const valueKey = widget.seriesKeys?.[0];
      if (!valueKey) return [] as any[];

      const values = data.data
        .map((row) => {
          const raw = row[valueKey];
          const num = typeof raw === 'number' ? raw : Number(raw);
          return Number.isFinite(num) ? num : null;
        })
        .filter((v): v is number => v !== null);

      if (!values.length) return [] as any[];

      const min = Math.min(...values);
      const max = Math.max(...values);
      const binCount = 10;
      const range = max - min || 1;
      const binSize = range / binCount;

      const bins = new Array(binCount).fill(0) as number[];
      values.forEach((v) => {
        let idx = Math.floor((v - min) / binSize);
        if (idx >= binCount) idx = binCount - 1;
        if (idx < 0) idx = 0;
        bins[idx] += 1;
      });

      if (widget.type === 'histogram') {
        return bins.map((count, i) => {
          const from = min + binSize * i;
          const to = from + binSize;
          const label = `${from.toFixed(0)}-${to.toFixed(0)}`;
          return { bin: label, count } as any;
        });
      }

      const maxCount = Math.max(...bins) || 1;
      return bins.map((count, i) => {
        const center = min + binSize * (i + 0.5);
        const density = count / maxCount;
        return {
          value: center,
          positive: density,
          negative: -density,
        } as any;
      });
    }

    if (widget.type === 'gauge' || widget.type === 'progress') {
      const valueKey = widget.seriesKeys?.[0];
      if (!valueKey) return [] as any[];

      const values = data.data
        .map((row) => {
          const raw = row[valueKey];
          const num = typeof raw === 'number' ? raw : Number(raw);
          return Number.isFinite(num) ? num : null;
        })
        .filter((v): v is number => v !== null);

      if (!values.length) return [] as any[];

      const sum = values.reduce((acc, v) => acc + v, 0);
      const avg = sum / values.length;
      const clamped = Math.max(0, Math.min(avg, 100));

      return [
        {
          name: valueKey,
          value: clamped,
        },
      ] as any[];
    }

    if (!widget.xKey) return [] as any[];

    if (widget.type === 'bubble') {
      if (!widget.yKey || !widget.sizeKey) return [] as any[];
      return data.data.map((row) => {
        const xVal = row[widget.xKey!];
        const yRaw = row[widget.yKey!];
        const sRaw = row[widget.sizeKey!];
        const yVal = typeof yRaw === 'number' ? yRaw : Number(yRaw);
        const sVal = typeof sRaw === 'number' ? sRaw : Number(sRaw);
        return {
          [widget.xKey!]: xVal,
          [widget.yKey!]: Number.isFinite(yVal) ? yVal : 0,
          [widget.sizeKey!]: Number.isFinite(sVal) ? sVal : 0,
        } as any;
      });
    }

    if (
      widget.type === 'grouped' ||
      widget.type === 'stacked' ||
      widget.type === 'radar' ||
      widget.type === 'stackedArea'
    ) {
      const series = widget.seriesKeys || [];
      return data.data.map((row) => {
        const base: any = { [widget.xKey!]: row[widget.xKey!] };
        series.forEach((key) => {
          const raw = row[key];
          const num = typeof raw === 'number' ? raw : Number(raw);
          base[key] = Number.isFinite(num) ? num : 0;
        });
        return base;
      });
    }

    if (!widget.yKey) return [] as any[];

    return data.data.map((row) => {
      const xVal = row[widget.xKey!];
      const yRaw = row[widget.yKey!];
      const yVal = typeof yRaw === 'number' ? yRaw : Number(yRaw);
      return {
        [widget.xKey!]: xVal,
        [widget.yKey!]: Number.isFinite(yVal) ? yVal : 0,
      } as any;
    });
  };

  const handleToggleSeries = (col: string) => {
    setNewSeries((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  };

  return (
    <div className="h-full overflow-auto custom-scrollbar p-6 space-y-6 bg-gray-50/50">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-gray-700 font-medium mr-2">
          <BarChart2 size={18} className="text-brand-500" />
          <span>Build your dashboard</span>
        </div>
        <select
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={newType}
          onChange={(e) => setNewType(e.target.value as WidgetType)}
        >
          <option value="bar">Bar Chart</option>
          <option value="column">Column Chart</option>
          <option value="grouped">Grouped Bar</option>
          <option value="stacked">Stacked Bar</option>
          <option value="radar">Radar Chart</option>
          <option value="stackedArea">Stacked Area</option>
          <option value="histogram">Histogram</option>
          <option value="violin">Violin Chart (Vertical)</option>
          <option value="violinHorizontal">Violin Chart (Horizontal)</option>
          <option value="scatter">Scatter Plot</option>
          <option value="bubble">Bubble Chart</option>
          <option value="line">Line Chart</option>
          <option value="area">Area Chart</option>
          <option value="gauge">Gauge Chart</option>
          <option value="progress">Progress Bar Chart</option>
          <option value="donut">Donut Chart</option>
          <option value="pie">Pie Chart</option>
          <option value="treemap">Treemap</option>
          <option value="choropleth">Choropleth Map</option>
          <option value="bubbleMap">Bubble Map</option>
          <option value="text">Text</option>
        </select>
        {newType !== 'text' &&
          newType !== 'grouped' &&
          newType !== 'stacked' &&
          newType !== 'radar' &&
          newType !== 'stackedArea' &&
          newType !== 'histogram' &&
          newType !== 'violin' &&
          newType !== 'violinHorizontal' &&
          newType !== 'gauge' &&
          newType !== 'progress' && (
          <>
            <select
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={newX}
              onChange={(e) => setNewX(e.target.value)}
            >
              <option value="" disabled>
                X Axis
              </option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
            <select
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={newY}
              onChange={(e) => setNewY(e.target.value)}
            >
              <option value="" disabled>
                Y Axis
              </option>
              {(numericColumns.length ? numericColumns : columns).map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </>
        )}
        {newType === 'bubble' && (
          <select
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
          >
            <option value="" disabled>
              Size
            </option>
            {(numericColumns.length ? numericColumns : columns).map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        )}
        {(newType === 'histogram' ||
          newType === 'violin' ||
          newType === 'violinHorizontal' ||
          newType === 'gauge' ||
          newType === 'progress') && (
          <select
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={newY}
            onChange={(e) => setNewY(e.target.value)}
          >
            <option value="" disabled>
              Value
            </option>
            {(numericColumns.length ? numericColumns : columns).map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        )}
        {(newType === 'grouped' ||
          newType === 'stacked' ||
          newType === 'radar' ||
          newType === 'stackedArea') && (
          <>
            <select
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={newX}
              onChange={(e) => setNewX(e.target.value)}
            >
              <option value="" disabled>
                X Axis
              </option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1">
              {(numericColumns.length ? numericColumns : columns).map((col) => {
                const selected = newSeries.includes(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => handleToggleSeries(col)}
                    className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                      selected
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {col}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <button
          onClick={handleAddWidget}
          disabled={newType !== 'text' && !columns.length}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Plus size={16} />
          Add Widget
        </button>
      </div>

      {widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white border border-dashed border-gray-300 rounded-xl text-center text-gray-500">
          <GripVertical className="mb-3 text-gray-400" />
          <p className="font-medium mb-1">No widgets yet</p>
          <p className="text-sm">Use the builder above to add charts, then drag & drop to rearrange them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
          {widgets.map((widget) => {
            const chartData = widget.type === 'text' ? [] : buildChartData(widget);
            return (
              <div
                key={widget.id}
                className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[360px] transition-shadow ${
                  draggingId === widget.id ? 'ring-2 ring-brand-500 ring-offset-2' : ''
                }`}
                draggable
                onDragStart={() => handleDragStart(widget.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(widget.id)}
                onDragEnd={handleDragEnd}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button className="cursor-grab text-gray-400 hover:text-gray-600">
                      <GripVertical size={16} />
                    </button>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">{widget.title}</h3>
                      <p className="text-xs text-gray-500">
                        {widget.type === 'text'
                          ? 'Text widget'
                          : widget.type === 'histogram' ||
                            widget.type === 'violin' ||
                            widget.type === 'violinHorizontal' ||
                            widget.type === 'gauge' ||
                            widget.type === 'progress'
                          ? `${
                              widget.type === 'histogram'
                                ? 'Histogram'
                                : widget.type === 'violin'
                                ? 'Violin'
                                : widget.type === 'violinHorizontal'
                                ? 'Violin (Horizontal)'
                                : widget.type === 'gauge'
                                ? 'Gauge'
                                : 'Progress Bar'
                            } · Value: ${widget.seriesKeys?.[0] || ''}`
                          : widget.type === 'grouped' ||
                            widget.type === 'stacked' ||
                            widget.type === 'radar' ||
                            widget.type === 'stackedArea'
                          ? `${
                              widget.type === 'grouped'
                                ? 'Grouped Bar'
                                : widget.type === 'stacked'
                                ? 'Stacked Bar'
                                : widget.type === 'radar'
                                ? 'Radar Chart'
                                : 'Stacked Area'
                            } · X: ${widget.xKey} · Series: ${
                              widget.seriesKeys?.join(', ') || ''
                            }`
                          : widget.type === 'bubble'
                          ? `BUBBLE · X: ${widget.xKey} · Y: ${widget.yKey} · Size: ${
                              widget.sizeKey || ''
                            }`
                          : `${widget.type.toUpperCase()} · X: ${widget.xKey} · Y: ${widget.yKey}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveWidget(widget.id)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  {widget.type === 'text' ? (
                    <div className="h-full">
                      <textarea
                        className="w-full h-full resize-none border border-gray-200 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="Write your notes here..."
                        value={widget.content ?? ''}
                        onChange={(e) =>
                          setWidgets((prev) =>
                            prev.map((w) =>
                              w.id === widget.id ? { ...w, content: e.target.value } : w,
                            ),
                          )
                        }
                      />
                    </div>
                  ) : widget.type === 'progress' ? (
                    (() => {
                      const gaugeData = buildChartData(widget);
                      const raw = (gaugeData[0] as any)?.value ?? 0;
                      const valueNum = typeof raw === 'number' ? raw : Number(raw) || 0;
                      const clamped = Math.max(0, Math.min(valueNum, 100));
                      return (
                        <div className="flex flex-col justify-center h-full px-6">
                          <div className="flex items-center justify-between text-sm text-gray-700 mb-4">
                            <span>{widget.seriesKeys?.[0] || 'Progress'}</span>
                            <span>{`${clamped.toFixed(0)}%`}</span>
                          </div>
                          <div className="w-full h-6 rounded-full bg-gray-200 border border-gray-300 overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full"
                              style={{ width: `${clamped}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()
                  ) : widget.type === 'choropleth' ? (
                    (() => {
                      if (!widget.xKey || !widget.yKey) {
                        return (
                          <div className="flex items-center justify-center h-full text-xs text-gray-400">
                            Select X (country) and Y (value) to render the map
                          </div>
                        );
                      }

                      const locations = chartData.map((row: any) => row[widget.xKey!]);
                      const zValues = chartData.map((row: any) => {
                        const raw = row[widget.yKey!];
                        const num = typeof raw === 'number' ? raw : Number(raw);
                        return Number.isFinite(num) ? num : 0;
                      });

                      return (
                        <PlotlyChart
                          style={{ width: '100%', height: '100%' }}
                          data={[
                            {
                              type: 'choropleth',
                              locations,
                              z: zValues,
                              text: locations,
                              colorscale: 'Blues',
                              marker: { line: { color: '#ffffff', width: 0.5 } },
                              colorbar: { title: widget.yKey },
                              locationmode: 'country names',
                            },
                          ]}
                          layout={{
                            margin: { l: 0, r: 0, t: 0, b: 0 },
                            geo: {
                              projection: { type: 'natural earth' },
                              showcoastlines: true,
                              showcountries: true,
                            },
                          }}
                          config={{ displayModeBar: false, responsive: true }}
                        />
                      );
                    })()
                  ) : widget.type === 'bubbleMap' ? (
                    (() => {
                      if (!widget.xKey || !widget.yKey) {
                        return (
                          <div className="flex items-center justify-center h-full text-xs text-gray-400">
                            Select X (country) and Y (value) to render the bubble map
                          </div>
                        );
                      }

                      const locations = chartData.map((row: any) => row[widget.xKey!]);
                      const values = chartData.map((row: any) => {
                        const raw = row[widget.yKey!];
                        const num = typeof raw === 'number' ? raw : Number(raw);
                        return Number.isFinite(num) ? num : 0;
                      });

                      if (!values.length) {
                        return (
                          <div className="flex items-center justify-center h-full text-xs text-gray-400">
                            No numeric data for selected value
                          </div>
                        );
                      }

                      const min = Math.min(...values);
                      const max = Math.max(...values);
                      const range = max - min || 1;
                      const sizes = values.map((v) => {
                        const norm = (v - min) / range;
                        return 6 + norm * 20; // 6–26 px radius
                      });

                      return (
                        <PlotlyChart
                          style={{ width: '100%', height: '100%' }}
                          data={[
                            {
                              type: 'scattergeo',
                              locations,
                              locationmode: 'country names',
                              text: locations.map((loc: any, i: number) => `${String(loc)}: ${values[i]}`),
                              marker: {
                                size: sizes,
                                color: values,
                                colorscale: 'Blues',
                                line: { color: '#ffffff', width: 0.5 },
                                sizemin: 4,
                              },
                            },
                          ]}
                          layout={{
                            margin: { l: 0, r: 0, t: 0, b: 0 },
                            geo: {
                              projection: { type: 'natural earth' },
                              showcoastlines: true,
                              showcountries: true,
                            },
                          }}
                          config={{ displayModeBar: false, responsive: true }}
                        />
                      );
                    })()
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {widget.type === 'bar' && (
                        <BarChart data={chartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis
                            type="category"
                            dataKey={widget.xKey}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey={widget.yKey} fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      )}
                      {widget.type === 'histogram' && (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="bin" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                      {widget.type === 'violin' && (
                        <AreaChart data={chartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis
                            type="number"
                            dataKey="value"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="positive"
                            stroke={COLORS[0]}
                            fill={COLORS[0]}
                            fillOpacity={0.4}
                          />
                          <Area
                            type="monotone"
                            dataKey="negative"
                            stroke={COLORS[0]}
                            fill={COLORS[0]}
                            fillOpacity={0.4}
                          />
                        </AreaChart>
                      )}
                      {widget.type === 'scatter' && (
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey={widget.xKey}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            dataKey={widget.yKey}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip />
                          <Legend />
                          <Scatter data={chartData} fill={COLORS[3]} />
                        </ScatterChart>
                      )}
                      {widget.type === 'bubble' && (
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey={widget.xKey}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            dataKey={widget.yKey}
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <ZAxis dataKey={widget.sizeKey} range={[40, 200]} />
                          <Tooltip />
                          <Legend />
                          <Scatter data={chartData} fill={COLORS[4]} />
                        </ScatterChart>
                      )}
                      {widget.type === 'violinHorizontal' && (
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            type="number"
                            dataKey="value"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis type="number" hide />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="positive"
                            stroke={COLORS[0]}
                            fill={COLORS[0]}
                            fillOpacity={0.4}
                          />
                          <Area
                            type="monotone"
                            dataKey="negative"
                            stroke={COLORS[0]}
                            fill={COLORS[0]}
                            fillOpacity={0.4}
                          />
                        </AreaChart>
                      )}
                      {widget.type === 'column' && (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey={widget.xKey} fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey={widget.yKey} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                      {(widget.type === 'grouped' || widget.type === 'stacked') && (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey={widget.xKey} fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Legend />
                          {(widget.seriesKeys || []).map((key, index) => (
                            <Bar
                              key={key}
                              dataKey={key}
                              stackId={widget.type === 'stacked' ? 'stack' : undefined}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </BarChart>
                      )}
                      {widget.type === 'radar' && (
                        <RadarChart data={chartData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey={widget.xKey} />
                          <PolarRadiusAxis />
                          {(widget.seriesKeys || []).map((key, index) => (
                            <Radar
                              key={key}
                              name={key}
                              dataKey={key}
                              stroke={COLORS[index % COLORS.length]}
                              fill={COLORS[index % COLORS.length]}
                              fillOpacity={0.3}
                            />
                          ))}
                          <Tooltip />
                          <Legend />
                        </RadarChart>
                      )}
                      {widget.type === 'stackedArea' && (
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey={widget.xKey} fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Legend />
                          {(widget.seriesKeys || []).map((key, index) => (
                            <Area
                              key={key}
                              type="monotone"
                              dataKey={key}
                              stackId="stack"
                              stroke={COLORS[index % COLORS.length]}
                              fill={COLORS[index % COLORS.length]}
                              fillOpacity={0.35}
                            />
                          ))}
                        </AreaChart>
                      )}
                      {widget.type === 'line' && (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey={widget.xKey} fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey={widget.yKey}
                          stroke={COLORS[1]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    )}
                      {widget.type === 'area' && (
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey={widget.xKey} fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey={widget.yKey}
                          stroke={COLORS[2]}
                          fill={COLORS[2]}
                          fillOpacity={0.25}
                        />
                      </AreaChart>
                    )}
                      {widget.type === 'gauge' && (() => {
                        const raw = (chartData[0] as any)?.value ?? 0;
                        const value = typeof raw === 'number' ? raw : Number(raw) || 0;
                        return (
                          <RadialBarChart
                            innerRadius="70%"
                            outerRadius="100%"
                            data={chartData}
                            startAngle={180}
                            endAngle={0}
                          >
                            <RadialBar
                              minAngle={5}
                              background
                              clockWise
                              dataKey="value"
                              fill={COLORS[0]}
                            />
                            <Tooltip />
                            <text
                              x="50%"
                              y="50%"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className="text-xs fill-gray-700"
                            >
                              {`${value.toFixed(0)}%`}
                            </text>
                          </RadialBarChart>
                        );
                      })()}
                      {widget.type === 'treemap' && (
                      <Treemap
                        data={chartData}
                        dataKey={widget.yKey}
                        nameKey={widget.xKey}
                        stroke="#ffffff"
                        fill={COLORS[0]}
                      />
                    )}
                      {widget.type === 'donut' && (
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey={widget.yKey}
                          nameKey={widget.xKey}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                        >
                          {chartData.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                      )}
                      {widget.type === 'pie' && (
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey={widget.yKey}
                          nameKey={widget.xKey}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          paddingAngle={5}
                        >
                          {chartData.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManualDashboard;
