import React from 'react';
import { View, StyleSheet } from 'react-native';

// 簡約可愛、有眼睛嘴巴的小吉祥物
export default function Mascot({ size = 96, color = '#B9E3A8', happy = false }) {
  const eye = Math.max(6, size * 0.09);
  const mouthW = happy ? size * 0.34 : size * 0.22;
  return (
    <View
      style={[
        styles.body,
        {
          width: size,
          height: size,
          borderRadius: size * 0.34,
          backgroundColor: color,
        },
      ]}
    >
      <View style={[styles.face, { top: size * 0.34 }]}>
        <View style={{ width: eye, height: eye, borderRadius: eye, backgroundColor: '#3D3348', marginHorizontal: size * 0.11 }} />
        <View style={{ width: eye, height: eye, borderRadius: eye, backgroundColor: '#3D3348', marginHorizontal: size * 0.11 }} />
      </View>
      <View
        style={{
          position: 'absolute',
          top: size * 0.52,
          width: mouthW,
          height: mouthW * (happy ? 0.6 : 0.35),
          borderBottomLeftRadius: mouthW,
          borderBottomRightRadius: mouthW,
          borderWidth: 3,
          borderTopWidth: 0,
          borderColor: '#3D3348',
        }}
      />
      <View style={[styles.cheek, { left: size * 0.14, top: size * 0.5 }]} />
      <View style={[styles.cheek, { right: size * 0.14, top: size * 0.5 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6FA95E',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  face: {
    position: 'absolute',
    flexDirection: 'row',
  },
  cheek: {
    position: 'absolute',
    width: 12,
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(240,138,155,0.55)',
  },
});
