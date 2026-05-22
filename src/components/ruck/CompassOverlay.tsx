import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

interface CompassOverlayProps {
  heading: number; // degrees, 0 = north, clockwise
}

const SIZE = 52;
const R = SIZE / 2;
const NEEDLE_LEN = R - 8;

export function CompassOverlay({ heading }: CompassOverlayProps) {
  // North tip of needle (red)
  const northTipX = R + NEEDLE_LEN * Math.sin(((heading - 180) * Math.PI) / 180);
  const northTipY = R - NEEDLE_LEN * Math.cos(((heading - 180) * Math.PI) / 180);
  // South tip of needle (white)
  const southTipX = R + NEEDLE_LEN * Math.sin((heading * Math.PI) / 180);
  const southTipY = R - NEEDLE_LEN * Math.cos((heading * Math.PI) / 180);

  // Arrowhead base offsets (perpendicular to needle, 6px wide)
  const perpX = Math.cos((heading * Math.PI) / 180) * 4;
  const perpY = Math.sin((heading * Math.PI) / 180) * 4;

  const northPoints = [
    `${northTipX},${northTipY}`,
    `${R - perpX},${R - perpY}`,
    `${R + perpX},${R + perpY}`,
  ].join(' ');

  const southPoints = [
    `${southTipX},${southTipY}`,
    `${R + perpX},${R + perpY}`,
    `${R - perpX},${R - perpY}`,
  ].join(' ');

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        {/* Outer ring */}
        <Circle cx={R} cy={R} r={R - 2} fill="rgba(3,10,7,0.82)" stroke="rgba(145,230,163,0.45)" strokeWidth={1} />
        {/* Cardinal tick marks */}
        {[0, 90, 180, 270].map((deg) => {
          const innerR = R - 8;
          const outerR = R - 3;
          const a = ((deg - heading) * Math.PI) / 180;
          return (
            <Line
              key={deg}
              x1={R + innerR * Math.sin(a)}
              y1={R - innerR * Math.cos(a)}
              x2={R + outerR * Math.sin(a)}
              y2={R - outerR * Math.cos(a)}
              stroke={deg === 0 ? '#e05050' : 'rgba(145,230,163,0.6)'}
              strokeWidth={deg === 0 ? 2 : 1}
            />
          );
        })}
        {/* South needle (white) */}
        <Polygon points={southPoints} fill="#ffffff" fillOpacity={0.7} />
        {/* North needle (red) */}
        <Polygon points={northPoints} fill="#e05050" />
        {/* Center dot */}
        <Circle cx={R} cy={R} r={3} fill="#ffffff" />
      </Svg>
      <Text style={styles.label}>{Math.round(heading)}°</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 2 },
  label: { color: '#ffffff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});
