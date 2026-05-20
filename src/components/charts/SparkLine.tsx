import { normalise } from '@/src/utils/chartDataUtils';
import Svg, { Polyline } from 'react-native-svg';

type Props = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
};

export default function SparkLine({
  data,
  width = 80,
  height = 28,
  color = '#FC4C02',
  strokeWidth = 1.5,
}: Props) {
  if (data.length < 2) return null;

  const normed = normalise(data);
  const points = normed
    .map((v, i) => {
      const x = i * (width / (data.length - 1));
      const y = height - v * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
