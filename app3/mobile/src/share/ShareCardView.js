import React from 'react';
import { View, Text } from 'react-native';
import { ItemGlyph } from '../components/ItemGlyph';
import { footerBrand } from './config';
import { tLocale } from '../i18n';

/**
 * Off-screen / preview card. Line-art on a cream (or Pro) wash.
 * Does not include notes or dates.
 */
export default function ShareCardView({
  style: theme,
  title,
  hideName,
  daysNum,
  daysUnit,
  icon = 'brush',
  width,
  height,
  locale = 'zh',
}) {
  const headline = daysNum == null ? tLocale(locale, 'share.notYet') : `${daysNum}`;
  const unit = daysNum == null ? '' : daysUnit;
  const prefix = tLocale(locale, 'share.prefix');
  const glyph = Math.round(width * 0.22);
  return (
    <View
      style={{
        width,
        height,
        backgroundColor: theme.bg,
        paddingHorizontal: Math.round(width * 0.1),
        paddingTop: Math.round(height * 0.14),
        paddingBottom: Math.round(height * 0.08),
      }}
    >
      <View
        style={{
          width: glyph + 28,
          height: glyph + 28,
          borderRadius: (glyph + 28) / 2,
          backgroundColor: theme.wash,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ItemGlyph kind={icon} color={theme.accent} size={glyph} strokeWidth={2.2} />
      </View>
      {!hideName && title ? (
        <Text
          numberOfLines={2}
          style={{
            marginTop: Math.round(height * 0.06),
            fontFamily: 'NaikaiSubset-SemiBold',
            fontSize: Math.round(width * 0.062),
            color: theme.ink,
          }}
        >
          {title}
        </Text>
      ) : null}
      <Text
        style={{
          marginTop: hideName ? Math.round(height * 0.06) : Math.round(height * 0.03),
          fontFamily: 'NaikaiSubset-Regular',
          fontSize: Math.round(width * 0.048),
          color: theme.accent,
        }}
      >
        {prefix}
      </Text>
      <Text
        style={{
          fontFamily: 'NaikaiSubset-Bold',
          fontSize: Math.round(width * 0.22),
          lineHeight: Math.round(width * 0.24),
          color: theme.ink,
        }}
      >
        {headline}
        {unit ? (
          <Text style={{ fontFamily: 'NaikaiSubset-Regular', fontSize: Math.round(width * 0.07) }}>
            {` ${unit}`}
          </Text>
        ) : null}
      </Text>
      <View style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <Text
          style={{
            fontFamily: 'NaikaiSubset-SemiBold',
            fontSize: Math.round(width * 0.036),
            color: theme.accent,
          }}
        >
          {footerBrand(locale)}
        </Text>
      </View>
    </View>
  );
}
