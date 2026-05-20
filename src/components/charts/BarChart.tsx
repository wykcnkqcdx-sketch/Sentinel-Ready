import Svg, { Rect, Text as SvgText } from 'react-native-svg';

type Props = {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  barColor?: string;
  labelColor?: string;
};

const LABEL_AREA = 14;

export default function BarChart({
  data,
  labels,
  width = 280,
  height = 80,
  barColor = '#B5852C',
  labelColor = '#8FAEC8',
}: Props) {
  const max = Math.max(...data);
  if (max === 0) return null;

  const chartHeight = labels ? height - LABEL_AREA : height;
  const barWidth = (width / data.length) * 0.7;
  const totalSlot = width / data.length;

  return (
    <Svg width={width} height={height}>
      {data.map((value, i) => {
        const barH = (value / max) * chartHeight;
        const x = i * totalSlot + (totalSlot - barWidth) / 2;
        const y = chartHeight - barH;
        const fill = i === data.length - 1 ? barColor : '#4a7a55';

        return (
          <Rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barH}
            fill={fill}
            rx={2}
          />
        );
      })}
      {labels
        ? labels.map((label, i) => {
            const cx = i * totalSlot + totalSlot / 2;
            return (
              <SvgText
                key={i}
                x={cx}
                y={height - 2}
                textAnchor="middle"
                fontSize={9}
                fill={labelColor}
              >
                {label}
              </SvgText>
            );
          })
        : null}
    </Svg>
  );
}
