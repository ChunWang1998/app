import React from 'react';
import { View } from 'react-native';
import { ItemGlyph } from './ItemGlyph';
import { useItemTone } from '../theme/useTheme';
import { OTHER_ICON } from '../lib/categories';

export function CategoryGlyph({ icon, name, size = 30, glyph = 16, inverted, onColor }) {
  const tone = useItemTone(icon || OTHER_ICON, name);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: inverted ? 'rgba(255,255,255,0.22)' : tone.ac }}>
      <ItemGlyph kind={icon || OTHER_ICON} color={inverted ? onColor : tone.acf} size={glyph} letter={name} />
    </View>
  );
}
