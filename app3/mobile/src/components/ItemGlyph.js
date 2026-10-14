import React from 'react';
import { Text } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export const ICON_KINDS = ['brush', 'drop', 'pill', 'leaf', 'bed', 'scissors', 'car', 'eye', 'mono'];

export function ItemGlyph({ kind = 'brush', color = '#3E9180', size = 20, strokeWidth = 1.7, letter = '' }) {
  if (kind === 'mono') {
    const ch = String(letter || '').trim().slice(0, 2);
    const glyph = ch ? [...ch][0] : '·';
    return (
      <Text
        style={{
          fontSize: Math.round(size * 0.62),
          lineHeight: size,
          height: size,
          width: size,
          textAlign: 'center',
          fontFamily: 'NaikaiSubset-Bold',
          color,
        }}
      >
        {glyph}
      </Text>
    );
  }
  const common = { stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  if (kind === 'drop') {
    return (
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Path d="M10 2.5S4.5 8.6 4.5 12.2a5.5 5.5 0 0 0 11 0C15.5 8.6 10 2.5 10 2.5Z" {...common} />
      </Svg>
    );
  }
  if (kind === 'eye') {
    return (
      <Svg width={size} height={size} viewBox="0 0 22 20">
        <Path d="M1.5 10S5 3.8 11 3.8 20.5 10 20.5 10 17 16.2 11 16.2 1.5 10 1.5 10Z" {...common} />
        <Circle cx="11" cy="10" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
      </Svg>
    );
  }
  if (kind === 'pill') {
    return (
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Rect x="2.2" y="6.8" width="15.6" height="6.4" rx="3.2" transform="rotate(-45 10 10)" {...common} />
        <Path d="m7.2 7.2 5.6 5.6" {...common} />
      </Svg>
    );
  }
  if (kind === 'bed') {
    return (
      <Svg width={size} height={size} viewBox="0 0 22 20">
        <Path d="M2 5v12M2 13h18v4M2 10h18v3M6 10V8a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 12 8v2" {...common} />
      </Svg>
    );
  }
  if (kind === 'leaf') {
    return (
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Path d="M4 16C4 8 8.5 3.5 17 3.5 17 12 12 16 4 16Z" {...common} />
        <Path d="M4 16 11 9" {...common} />
      </Svg>
    );
  }
  if (kind === 'scissors') {
    return (
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Circle cx="5" cy="5.5" r="2.5" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Circle cx="5" cy="14.5" r="2.5" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Path d="M7 7l10 8.5M7 13 17 4.5" {...common} />
      </Svg>
    );
  }
  if (kind === 'car') {
    return (
      <Svg width={size} height={size} viewBox="0 0 22 20">
        <Path d="M3 13V10l2-4.5h12L19 10v3M3 13h16v2.5H3Z" {...common} />
        <Circle cx="6.5" cy="13" r="1" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Circle cx="15.5" cy="13" r="1" stroke={color} strokeWidth={strokeWidth} fill="none" />
      </Svg>
    );
  }
  // brush (default)
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M3 17 13.5 6.5" {...common} />
      <Rect x="12" y="1.8" width="5" height="7.5" rx="1.5" transform="rotate(45 14.5 5.5)" {...common} />
      <Path d="M13 3.5l1 1M14.7 2l1 1" {...common} />
    </Svg>
  );
}
