import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  AreaChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer as RC,
} from 'recharts';
import { cn } from '@/lib/utils';

/**
 * Color configuration object for theme-aware colors
 */
export interface ColorConfig {
  light?: string;
  dark?: string;
}

/**
 * Base series configuration
 */
export interface BaseSeries {
  /**
   * Key in each data row to read numeric values from
   */
  dataKey: string;

  /**
   * Label displayed in legends and tooltips
   */
  label?: string;

  /**
   * Color for the series (chart color token, primitive color, CSS string, or theme-aware config)
   * Chart color tokens: blue, purple, orange, green, red, yellow, pink
   */
  color?: string | ColorConfig;

  /**
   * Stack ID to group series together
   */
  stack?: string;
}

/**
 * Bar series configuration
 */
export interface BarSeries extends BaseSeries {
  type: 'bar';
}

/**
 * Line series configuration
 */
export interface LineSeries extends BaseSeries {
  type: 'line';

  /**
   * Curve interpolation type
   */
  curveType?: 'linear' | 'natural' | 'monotone' | 'step' | 'basis' | 'bump';
}

/**
 * Area series configuration
 */
export interface AreaSeries extends BaseSeries {
  type: 'area';

  /**
   * Curve interpolation type
   */
  curveType?: 'linear' | 'natural' | 'monotone' | 'step' | 'basis' | 'bump';
}

/**
 * Chart component props
 */
export interface ChartProps {
  /**
   * Tabular dataset; each object represents a data row (required)
   */
  data: Array<unknown>;

  /**
   * Series definitions describing how to read and render data (required)
   */
  series: (BarSeries | LineSeries | AreaSeries)[];

  /**
   * X-axis configuration or the data key to use for the x-axis (required)
   */
  xAxis: string | { dataKey: string };

  /**
   * Show a left y-axis with tick labels
   * @default false
   */
  showYAxis?: boolean;

  /**
   * Display a legend describing the series
   * @default true
   */
  showLegend?: boolean;

  /**
   * Display a tooltip when hovering over data points
   * @default true
   */
  showTooltip?: boolean;

  /**
   * Gap size in px between bars in the same category
   */
  barGap?: number;

  /**
   * Gap size in px between bar categories
   */
  barCategoryGap?: string;

  /**
   * Flex growth/shrink factor
   */
  flex?: string | number;

  /**
   * Explicit height
   */
  height?: string | number;

  /**
   * Explicit width
   */
  width?: string | number;

  /**
   * Shorthand for both width and height
   */
  size?: string | number;

  /**
   * Shorthand for both minWidth and minHeight
   */
  minSize?: string | number;

  /**
   * Shorthand for both maxWidth and maxHeight
   */
  maxSize?: string | number;

  /**
   * Minimum height constraint
   */
  minHeight?: string | number;

  /**
   * Minimum width constraint
   */
  minWidth?: string | number;

  /**
   * Maximum height constraint
   */
  maxHeight?: string | number;

  /**
   * Maximum width constraint
   */
  maxWidth?: string | number;

  /**
   * Aspect ratio (e.g., 16/9)
   */
  aspectRatio?: string | number;

  /**
   * Additional CSS class names
   */
  className?: string;

  /**
   * Inline CSS styles
   */
  cssStyle?: React.CSSProperties;
}

/**
 * Chart color token to CSS variable mapping
 */
const chartColorTokens: Record<string, string> = {
  blue: 'var(--blue-400)',
  purple: 'var(--purple-400)',
  orange: 'var(--orange-400)',
  green: 'var(--green-400)',
  red: 'var(--red-400)',
  yellow: 'var(--yellow-400)',
  pink: 'var(--pink-400)',
};

/**
 * Get color value from token or config
 */
const getColorValue = (color: string | ColorConfig | undefined, defaultColor: string): string => {
  if (!color) return defaultColor;
  if (typeof color === 'string') {
    return chartColorTokens[color] || color;
  }
  return color.light || defaultColor;
};

/**
 * Get dimension value as string
 */
const getDimensionValue = (value: string | number | undefined): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return `${value}px`;
  return value;
};

/**
 * Default chart colors cycle
 */
const defaultColors = [
  'var(--blue-400)',
  'var(--purple-400)',
  'var(--orange-400)',
  'var(--green-400)',
  'var(--red-400)',
  'var(--yellow-400)',
  'var(--pink-400)',
];

/**
 * Chart Component - Render simple bar, line, and area charts from tabular data
 *
 * A flexible charting component supporting multiple series and visualization types.
 * Powered by Recharts for responsive, interactive charts.
 *
 * @example
 * ```tsx
 * <Chart
 *   data={[
 *     { date: "2025-01-01", Desktop: 100, Mobile: 200 },
 *     { date: "2025-01-02", Desktop: 200, Mobile: 100 },
 *   ]}
 *   series={[
 *     { type: "bar", dataKey: "Desktop" },
 *     { type: "bar", dataKey: "Mobile" },
 *   ]}
 *   xAxis="date"
 *   height={240}
 * />
 * ```
 */
export const Chart: React.FC<ChartProps> = ({
  data,
  series,
  xAxis,
  showYAxis = false,
  showLegend = true,
  showTooltip = true,
  barGap,
  barCategoryGap,
  flex,
  height,
  width,
  size,
  minSize,
  maxSize,
  minHeight,
  minWidth,
  maxHeight,
  maxWidth,
  aspectRatio,
  className = '',
  cssStyle,
}) => {
  const xAxisKey = typeof xAxis === 'string' ? xAxis : xAxis.dataKey;

  // Resolve dimensions
  let finalHeight = height;
  let finalWidth = width;
  let finalMinHeight = minHeight;
  let finalMinWidth = minWidth;
  let finalMaxHeight = maxHeight;
  let finalMaxWidth = maxWidth;

  if (size !== undefined && !height && !width) {
    finalHeight = size;
    finalWidth = size;
  }

  if (minSize !== undefined && !minHeight && !minWidth) {
    finalMinHeight = minSize;
    finalMinWidth = minSize;
  }

  if (maxSize !== undefined && !maxHeight && !maxWidth) {
    finalMaxHeight = maxSize;
    finalMaxWidth = maxSize;
  }

  const wrapperClasses = cn('w-chart', className);

  const inlineStyles: React.CSSProperties = {
    ...cssStyle,
    flex: flex,
    height: getDimensionValue(finalHeight as number | string),
    width: getDimensionValue(finalWidth as number | string),
    minHeight: getDimensionValue(finalMinHeight as number | string),
    minWidth: getDimensionValue(finalMinWidth as number | string),
    maxHeight: getDimensionValue(finalMaxHeight as number | string),
    maxWidth: getDimensionValue(finalMaxWidth as number | string),
    aspectRatio: typeof aspectRatio === 'number' ? aspectRatio : aspectRatio,
    position: 'relative',
  };

  // Determine if we need composed chart (mixed types)
  const hasMultipleTypes = new Set(series.map((s) => s.type)).size > 1;

  // Get series colors
  const seriesWithColors = useMemo(() => {
    return series.map((s, index) => ({
      ...s,
      color: getColorValue(s.color, defaultColors[index % defaultColors.length]),
    }));
  }, [series]);

  // Render chart based on series types
  const renderChart = () => {
    if (hasMultipleTypes) {
      // Use ComposedChart for mixed types
      return (
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} />
          {showYAxis && <YAxis />}
          {showTooltip && <Tooltip />}
          {showLegend && <Legend />}
          {seriesWithColors.map((s) => {
            const key = `${s.type}-${s.dataKey}`;
            if (s.type === 'bar') {
              return (
                <Bar
                  key={key}
                  dataKey={s.dataKey}
                  fill={s.color}
                  name={s.label || s.dataKey}
                  gap={barGap}
                  stackId={s.stack}
                />
              );
            } else if (s.type === 'line') {
              return (
                <Line
                  key={key}
                  type={(s as LineSeries).curveType || 'natural'}
                  dataKey={s.dataKey}
                  stroke={s.color}
                  name={s.label || s.dataKey}
                  stackId={s.stack}
                />
              );
            } else if (s.type === 'area') {
              return (
                <Area
                  key={key}
                  type={(s as AreaSeries).curveType || 'natural'}
                  dataKey={s.dataKey}
                  fill={s.color}
                  stroke={s.color}
                  name={s.label || s.dataKey}
                  stackId={s.stack}
                />
              );
            }
          })}
        </ComposedChart>
      );
    }

    // Single type chart optimization
    const firstType = series[0]?.type;

    if (firstType === 'bar') {
      return (
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} />
          {showYAxis && <YAxis />}
          {showTooltip && <Tooltip />}
          {showLegend && <Legend />}
          {seriesWithColors.map((s, index) => (
            <Bar
              key={`bar-${index}`}
              dataKey={s.dataKey}
              fill={s.color}
              name={s.label || s.dataKey}
              gap={barGap}
              categoryGap={barCategoryGap}
              stackId={s.stack}
            />
          ))}
        </BarChart>
      );
    } else if (firstType === 'line') {
      return (
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} />
          {showYAxis && <YAxis />}
          {showTooltip && <Tooltip />}
          {showLegend && <Legend />}
          {seriesWithColors.map((s, index) => (
            <Line
              key={`line-${index}`}
              type={(s as LineSeries).curveType || 'natural'}
              dataKey={s.dataKey}
              stroke={s.color}
              name={s.label || s.dataKey}
              stackId={s.stack}
            />
          ))}
        </LineChart>
      );
    } else if (firstType === 'area') {
      return (
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxisKey} />
          {showYAxis && <YAxis />}
          {showTooltip && <Tooltip />}
          {showLegend && <Legend />}
          {seriesWithColors.map((s, index) => (
            <Area
              key={`area-${index}`}
              type={(s as AreaSeries).curveType || 'natural'}
              dataKey={s.dataKey}
              fill={s.color}
              stroke={s.color}
              name={s.label || s.dataKey}
              stackId={s.stack}
            />
          ))}
        </AreaChart>
      );
    }
  };

  return (
    <div className={wrapperClasses} style={inlineStyles} data-w-component="chart">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default Chart;
