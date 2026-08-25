import React, { useEffect, useRef } from 'react';
import { Dimensions, Keyboard, Platform, TextInput } from 'react-native';

/**
 * Keeps the focused TextInput above the software keyboard inside a ScrollView.
 */
export function useKeyboardAwareScroll() {
  const scrollRef = useRef(null);
  const scrollY = useRef(0);
  const focused = useRef(null);
  const kbRef = useRef(0);

  const scrollFocusedIntoView = () => {
    const node = focused.current;
    if (!node?.measureInWindow) return;
    node.measureInWindow((_x, y, _w, h) => {
      const screenH = Dimensions.get('window').height;
      const visibleBottom = screenH - kbRef.current - 24;
      const overflow = y + h - visibleBottom;
      if (overflow > 0) {
        scrollRef.current?.scrollTo({
          y: scrollY.current + overflow,
          animated: true,
        });
      }
    });
  };

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      kbRef.current = e.endCoordinates.height;
      setTimeout(scrollFocusedIntoView, Platform.OS === 'ios' ? 80 : 40);
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      kbRef.current = 0;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return {
    scrollRef,
    onScroll: (e) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
    },
    onInputFocus: (node) => {
      focused.current = node;
      setTimeout(scrollFocusedIntoView, Platform.OS === 'ios' ? 280 : 120);
    },
    onInputBlur: () => {
      focused.current = null;
    },
  };
}

export function AwareTextInput({ scrollOnFocus, scrollOnBlur, onFocus, onBlur, ...props }) {
  const ref = useRef(null);
  return (
    <TextInput
      {...props}
      ref={ref}
      onFocus={(e) => {
        scrollOnFocus?.(ref.current);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        scrollOnBlur?.();
        onBlur?.(e);
      }}
    />
  );
}
