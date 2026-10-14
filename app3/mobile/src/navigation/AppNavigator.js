import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import DetailScreen from '../screens/DetailScreen';
import EditScreen from '../screens/EditScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PaywallScreen from '../screens/PaywallScreen';
import WidgetPickerScreen from '../screens/WidgetPickerScreen';
import { light } from '../theme/colors';
import { subscribePaywallLink } from '../lib/deepLink';

const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: light.bg,
    card: light.cell,
    text: light.label,
    border: light.sep,
    primary: light.brand,
  },
};

export default function AppNavigator({ initial }) {
  const navRef = React.useRef();
  React.useEffect(() => {
    if (!initial) return;
    const id = setTimeout(() => {
      try {
        navRef.current?.navigate?.(initial.name, initial.params || {});
      } catch {}
    }, 80);
    return () => clearTimeout(id);
  }, [initial]);
  React.useEffect(() => {
    return subscribePaywallLink((name, params) => {
      try { navRef.current?.navigate?.(name, params || {}); } catch {}
    });
  }, []);
  return (
    <NavigationContainer ref={navRef} theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
        <Stack.Screen
          name="Edit"
          component={EditScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Paywall" component={PaywallScreen} />
        <Stack.Screen name="WidgetPicker" component={WidgetPickerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
