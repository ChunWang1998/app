import React from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { useThemeColors } from '../theme/useTheme';

export function Mascot({ mood = 'idle', size = 60 }) {
  const c = useThemeColors();
  const stroke = c.label;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityRole="image">
      <Path d="M37 90l-4 6M63 90l4 6" stroke={stroke} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 30a11 11 0 0 1 17-12M79 30a11 11 0 0 0-17-12" fill={c.tint} stroke={stroke} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M50 24v-6M45 17h10" stroke={stroke} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={50} cy={58} r={32} fill={c.cell} stroke={stroke} strokeWidth={3.2} />
      <Ellipse cx={33} cy={64} rx={5} ry={3.2} fill={c.blush} />
      <Ellipse cx={67} cy={64} rx={5} ry={3.2} fill={c.blush} />
      {mood === 'idle' && (
        <>
          <Circle cx={40} cy={55} r={3.4} fill={stroke} />
          <Circle cx={60} cy={55} r={3.4} fill={stroke} />
          <Path d="M46 63q4 3.5 8 0" stroke={stroke} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {mood === 'happy' && (
        <>
          <Path d="M35 56q5-6 10 0M55 56q5-6 10 0" stroke={stroke} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M44 62q6 9 12 0z" fill={stroke} />
          <Path d="M19 55 9 44M81 55l10-11" stroke={stroke} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {mood === 'sleepy' && (
        <>
          <Path d="M35 56h9M56 56h9" stroke={stroke} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={50} cy={65} r={2.4} fill={stroke} />
        </>
      )}
      {mood === 'worry' && (
        <>
          <Circle cx={40} cy={55} r={3.4} fill={stroke} />
          <Circle cx={60} cy={55} r={3.4} fill={stroke} />
          <Path d="M44 66q3-3 6 0t6 0" stroke={stroke} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M88 46q-4 6 0 8.5 4-2.5 0-8.5z" fill="#8FC6E8" stroke={stroke} strokeWidth={2.4} />
        </>
      )}
    </Svg>
  );
}
