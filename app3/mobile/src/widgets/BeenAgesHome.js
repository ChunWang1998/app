import { Button, HStack, Image, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

const BeenAgesHome = (props, environment) => {
  'widget';
  const LABEL = '#2E2925';
  const RED = '#E5533D';
  const ORANGE = '#E39424';
  const BRAND = '#3E9180';
  const family = environment.widgetFamily;
  const config = environment.configuration || {};
  const configId = config.itemId ? config.itemId : 'auto';
  const colorFor = (dueClass) => {
    if (dueClass === 'od') return RED;
    if (dueClass === 'soon') return ORANGE;
    return LABEL;
  };

  if (!props || !props.isPro) {
    return (
      <VStack spacing={8} modifiers={[padding({ all: 14 })]}>
        <Text modifiers={[font({ weight: 'semibold', size: 16 }), foregroundStyle(LABEL)]}>
          {props && props.upgradeLabel ? props.upgradeLabel : 'Upgrade to use'}
        </Text>
        <Link label="Been Ages" destination="beenages://paywall" />
      </VStack>
    );
  }

  const all = props.items || [];
  const pending = props.pending;
  const selectedSmall = configId !== 'auto' ? configId : (props.selectedSmall || 'auto');
  const selectedMedium = props.selectedMedium || [];

  const sorted = all.slice().sort((a, b) => {
    const rank = (it) => {
      if (it.dueClass === 'od') return 0;
      if (it.dueClass === 'soon') return 1;
      return 2;
    };
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const na = typeof a.daysNum === 'number' ? -a.daysNum : 0;
    const nb = typeof b.daysNum === 'number' ? -b.daysNum : 0;
    return na - nb;
  });

  const pickOne = () => {
    if (selectedSmall && selectedSmall !== 'auto') {
      const found = all.find((i) => i.id === selectedSmall);
      if (found) return [found];
    }
    return sorted.slice(0, 1);
  };

  const pickThree = () => {
    if (selectedMedium && selectedMedium.length) {
      const found = selectedMedium.map((id) => all.find((i) => i.id === id)).filter(Boolean);
      if (found.length) return found.slice(0, 3);
    }
    if (selectedSmall && selectedSmall !== 'auto') {
      const first = all.find((i) => i.id === selectedSmall);
      const rest = sorted.filter((i) => i.id !== selectedSmall);
      return [first, ...rest].filter(Boolean).slice(0, 3);
    }
    return sorted.slice(0, 3);
  };

  const shown = family === 'systemMedium' ? pickThree() : pickOne();

  const pressCheck = (item) => () => ({
    ...props,
    pending: {
      itemId: item.id,
      at: Date.now(),
      previousLastDoneAt: item.lastDoneAt,
      previousDaysNum: item.daysNum,
      previousDaysUnit: item.daysUnit,
      previousDaysText: item.daysText,
      previousDueClass: item.dueClass,
    },
    items: all.map((i) => (
      i.id === item.id
        ? { ...i, lastDoneAt: '', daysNum: 0, daysUnit: item.daysUnit || 'd', daysText: `0${item.daysUnit || 'd'}`, dueClass: '' }
        : i
    )),
  });

  const pressUndo = () => () => {
    const p = props.pending;
    if (!p) return { ...props, pending: null };
    return {
      ...props,
      pending: null,
      items: all.map((i) => (
        i.id === p.itemId
          ? {
            ...i,
            lastDoneAt: p.previousLastDoneAt,
            daysNum: p.previousDaysNum,
            daysUnit: p.previousDaysUnit,
            daysText: p.previousDaysText,
            dueClass: p.previousDueClass,
          }
          : i
      )),
    };
  };

  const glyph = (item, size) => {
    if (item.monoLetter) {
      return (
        <Text modifiers={[font({ size: Math.max(12, size - 2), weight: 'bold' }), foregroundStyle(LABEL)]}>
          {item.monoLetter}
        </Text>
      );
    }
    if (item.iconUri) {
      return <Image uiImage={item.iconUri} size={size} />;
    }
    return <Image systemName={item.sfSymbol || 'paintbrush.pointed'} size={size} color={BRAND} />;
  };

  const checkBtn = (item) => {
    const undoing = pending && pending.itemId === item.id;
    if (undoing) {
      return (
        <Button
          label={(props && props.labels && props.labels.undo) || 'Undo'}
          target={'undo:' + item.id}
          onPress={pressUndo()}
        />
      );
    }
    return (
      <Button
        label="✓"
        target={'check:' + item.id}
        onPress={pressCheck(item)}
      />
    );
  };

  if (!shown.length) {
    return (
      <VStack modifiers={[padding({ all: 14 })]}>
        <Text modifiers={[foregroundStyle(LABEL)]}>{(props && props.labels && props.labels.empty) || 'No items'}</Text>
      </VStack>
    );
  }

  if (family === 'systemMedium') {
    return (
      <VStack spacing={4} modifiers={[padding({ all: 10 })]}>
        {shown.map((item) => (
          <HStack key={item.id} spacing={8}>
            {glyph(item, 18)}
            <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(colorFor(item.dueClass))]}>
              {item.title}
            </Text>
            <Spacer />
            <Text modifiers={[font({ size: 20, weight: 'bold' }), foregroundStyle(colorFor(item.dueClass))]}>
              {pending && pending.itemId === item.id ? ((props && props.labels && props.labels.logged) || 'Logged') : (item.daysText || '—')}
            </Text>
            {checkBtn(item)}
          </HStack>
        ))}
      </VStack>
    );
  }

  const item = shown[0];
  const undoing = pending && pending.itemId === item.id;
  return (
    <VStack spacing={4} modifiers={[padding({ all: 12 }), frame({ maxWidth: 1000, maxHeight: 1000 })]}>
      <HStack spacing={6}>
        {glyph(item, 20)}
        <VStack spacing={0}>
          <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(LABEL)]}>
            {item.title}
          </Text>
          {item.reminderLabel ? (
            <Text modifiers={[font({ size: 11 }), foregroundStyle(LABEL)]}>
              {item.reminderLabel}
            </Text>
          ) : null}
        </VStack>
      </HStack>
      <HStack>
        <Text modifiers={[font({ size: 40, weight: 'bold' }), foregroundStyle(LABEL)]}>
          {undoing ? '0' : (item.daysNum == null ? '—' : String(item.daysNum))}
        </Text>
        <Text modifiers={[font({ size: 14 }), foregroundStyle(LABEL)]}>
          {undoing ? (item.daysUnit || 'd') : (item.daysUnit || '')}
        </Text>
      </HStack>
      <HStack>
        {undoing ? (
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(BRAND)]}>{(props && props.labels && props.labels.logged) || 'Logged'}</Text>
        ) : null}
        {checkBtn(item)}
      </HStack>
    </VStack>
  );
};

export default createWidget('BeenAgesHome', BeenAgesHome);
