import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const stroke = {
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function GearIcon({ color = '#3E9180', size = 23 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth={1.8} fill="none" />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke={color}
        strokeWidth={1.8}
        {...stroke}
      />
    </Svg>
  );
}

export function PlusIcon({ color = '#3E9180', size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 3v14M3 10h14" stroke={color} strokeWidth={2.2} {...stroke} />
    </Svg>
  );
}

export function CheckIcon({ color = '#3E9180', size = 16 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M3 8.5 6.5 12 13 4.5" stroke={color} strokeWidth={2.6} {...stroke} />
    </Svg>
  );
}

export function ChevronLeftIcon({ color = '#2E2925', size = 20 }) {
  return (
    <Svg width={size * 0.6} height={size} viewBox="0 0 12 20">
      <Path d="M10 2 2 10l8 8" stroke={color} strokeWidth={2.6} {...stroke} />
    </Svg>
  );
}

export function ChevronRightIcon({ color = 'rgba(46,41,37,0.28)', size = 14 }) {
  return (
    <Svg width={8} height={size} viewBox="0 0 8 14">
      <Path d="M1.5 1.5 6.5 7l-5 5.5" stroke={color} strokeWidth={2} {...stroke} />
    </Svg>
  );
}

export function InfinityIcon({ color = '#3E9180', size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 12c-2-2.7-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.3 5.5-4Zm0 0c2 2.7 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.3-5.5 4Z"
        stroke={color}
        strokeWidth={2}
        {...stroke}
      />
    </Svg>
  );
}

export function RestoreIcon({ color = '#fff', size = 17 }) {
  return (
    <Svg width={size} height={size + 2} viewBox="0 0 18 20">
      <Path d="M9 12V1.5M5 8.5l4 3.5 4-3.5M5.5 8H3.5v10.5h11V8h-2" stroke={color} strokeWidth={2} {...stroke} />
    </Svg>
  );
}

export function LockIcon({ color = '#fff', size = 17 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Rect x="4" y="9" width="12" height="9" rx="2" stroke={color} strokeWidth={2} {...stroke} />
      <Path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke={color} strokeWidth={2} {...stroke} />
    </Svg>
  );
}

export function MailIcon({ color = '#fff', size = 18 }) {
  return (
    <Svg width={size} height={size * 0.78} viewBox="0 0 20 15">
      <Rect x="1" y="1" width="18" height="13" rx="2" stroke={color} strokeWidth={1.8} {...stroke} />
      <Path d="m1.5 2 8.5 6.5L18.5 2" stroke={color} strokeWidth={1.8} {...stroke} />
    </Svg>
  );
}
