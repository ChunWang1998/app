import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export default function LogoMark({ size = 132 }) {
  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
        },
      ]}
    >
      <Image
        source={require('../../assets/logo.png')}
        style={{ width: size - 10, height: size - 10, borderRadius: (size - 10) * 0.24 }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brandDeep,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F0D9B8',
  },
});
