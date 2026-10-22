import React from 'react';
import { View, StyleSheet } from 'react-native';
import { gaugeColor, gaugeFill } from '../lib/meter';

export default function GaugeBar({ value }) {
  const fill = gaugeFill(value);
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 140, now: Number.isFinite(value) ? Math.round(value) : 0 }}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${Math.round(fill * 1000) / 10}%`,
            backgroundColor: gaugeColor(value),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E6E1DA',
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 7,
  },
});
