import { HStack, Image, Link, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

const BeenAgesLock = (props, environment) => {
  'widget';
  const LABEL = '#2E2925';
  const family = environment.widgetFamily;
  const config = environment.configuration || {};
  const configId = config.itemId ? config.itemId : 'auto';
  const hideNames = config.hideNames === true
    || config.hideNames === 'true'
    || !!(props && props.hideLockNames);

  if (!props || !props.isPro) {
    if (family === 'accessoryCircular') {
      return (
        <Link destination="beenages://paywall">
          <VStack>
            <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(LABEL)]}>Pro</Text>
          </VStack>
        </Link>
      );
    }
    return (
      <Link destination="beenages://paywall">
        <Text modifiers={[font({ size: 13 }), foregroundStyle(LABEL)]}>
          {props && props.upgradeLabel ? props.upgradeLabel : '升級就能用'}
        </Text>
      </Link>
    );
  }

  const all = props.items || [];
  const selectedSmall = configId !== 'auto' ? configId : (props.selectedSmall || 'auto');
  const sorted = all.slice().sort((a, b) => {
    const rank = (it) => (it.dueClass === 'od' ? 0 : it.dueClass === 'soon' ? 1 : 2);
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return (typeof b.daysNum === 'number' ? b.daysNum : 0) - (typeof a.daysNum === 'number' ? a.daysNum : 0);
  });
  let item = sorted[0];
  if (selectedSmall && selectedSmall !== 'auto') {
    const found = all.find((i) => i.id === selectedSmall);
    if (found) item = found;
  }

  if (!item) {
    return <Text modifiers={[foregroundStyle(LABEL)]}>—</Text>;
  }

  const num = item.daysNum == null ? '—' : String(item.daysNum);

  if (family === 'accessoryCircular') {
    return (
      <VStack spacing={0}>
        <Text modifiers={[font({ size: 22, weight: 'bold' }), foregroundStyle(LABEL)]}>{num}</Text>
        <Text modifiers={[font({ size: 10 }), foregroundStyle(LABEL)]}>{item.daysUnit || '天'}</Text>
      </VStack>
    );
  }

  return (
    <HStack spacing={6} modifiers={[padding({ all: 4 })]}>
      {item.iconUri ? (
        <Image uiImage={item.iconUri} size={14} />
      ) : (
        <Image systemName={item.sfSymbol || 'paintbrush.pointed'} size={14} color={LABEL} />
      )}
      {hideNames ? null : (
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(LABEL)]}>
          {item.title}
        </Text>
      )}
      <Text modifiers={[font({ size: 16, weight: 'bold' }), foregroundStyle(LABEL)]}>
        {item.daysText || num}
      </Text>
    </HStack>
  );
};

export default createWidget('BeenAgesLock', BeenAgesLock);
