import { G, Line, Rect, Svg, Text as SvgText } from 'react-native-svg';

type DataPoint = { value: number; date: string };

type Props = {
  data: DataPoint[];
  threshold: number;
  higherIsBetter: boolean;
  label: string;
  unit: string;
  formatValue?: (v: number) => string;
  width?: number;
  height?: number;
};

const BAR_GAP = 4;
const LABEL_HEIGHT = 14;
const THRESHOLD_LABEL_WIDTH = 36;

export function DfiftSparkline({
  data,
  threshold,
  higherIsBetter,
  label,
  unit,
  formatValue,
  width = 300,
  height = 72,
}: Props) {
  const points = data.slice(-10);
  if (points.length === 0) return null;

  const chartH = height - LABEL_HEIGHT;
  const chartW = width - THRESHOLD_LABEL_WIDTH;

  const allValues = [...points.map((p) => p.value), threshold];
  const minVal = Math.min(...allValues) * 0.9;
  const maxVal = Math.max(...allValues) * 1.1;
  const range = maxVal - minVal || 1;

  const barW = Math.floor((chartW - BAR_GAP * (points.length - 1)) / points.length);

  function yOf(v: number) {
    return chartH - ((v - minVal) / range) * chartH;
  }

  const threshY = yOf(threshold);
  const fmt = formatValue ?? ((v: number) => `${v}${unit}`);

  return (
    <Svg width={width} height={height}>
      <G>
        {points.map((pt, i) => {
          const passes = higherIsBetter ? pt.value >= threshold : pt.value <= threshold;
          const barH = Math.abs(yOf(pt.value) - chartH);
          const x = i * (barW + BAR_GAP);
          const color = passes ? 'rgba(181,133,44,0.3)' : '#7a3a1f';
          const topColor = passes ? '#B5852C' : '#D4A01A';
          return (
            <G key={i}>
              <Rect
                x={x}
                y={chartH - barH}
                width={barW}
                height={Math.max(2, barH)}
                fill={color}
                rx={2}
              />
              <Rect
                x={x}
                y={chartH - barH}
                width={barW}
                height={2}
                fill={topColor}
                rx={1}
              />
            </G>
          );
        })}

        <Line
          x1={0}
          y1={threshY}
          x2={chartW}
          y2={threshY}
          stroke="#B5852C"
          strokeWidth={1}
          strokeDasharray="4,3"
        />

        <SvgText
          x={chartW + 4}
          y={threshY + 4}
          fontSize={9}
          fill="#B5852C"
          fontWeight="bold"
        >
          {fmt(threshold)}
        </SvgText>

        <SvgText
          x={0}
          y={height}
          fontSize={9}
          fill="#8FAEC8"
          fontWeight="bold"
        >
          {label}
        </SvgText>

        {points.length > 0 && (
          <SvgText
            x={chartW}
            y={height}
            fontSize={9}
            fill="#ffffff"
            fontWeight="bold"
            textAnchor="end"
          >
            {fmt(points[points.length - 1].value)}
          </SvgText>
        )}
      </G>
    </Svg>
  );
}
