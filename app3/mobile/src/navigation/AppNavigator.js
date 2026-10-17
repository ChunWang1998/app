import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import DetailScreen from '../screens/DetailScreen';
import EditScreen from '../screens/EditScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PaywallScreen from '../screens/PaywallScreen';
import ReminderScreen from '../screens/ReminderScreen';
import ShareCardScreen from '../screens/ShareCardScreen';
import RecentlyDeletedScreen from '../screens/RecentlyDeletedScreen';
import WidgetPickerScreen from '../screens/WidgetPickerScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import CategoryEditScreen from '../screens/CategoryEditScreen';
import AiChatScreen from '../screens/AiChatScreen';
import { useTheme } from '../theme/useTheme';
import { subscribePaywallLink } from '../lib/deepLink';

const Stack = createNativeStackNavigator();

export default function AppNavigator({ initial }) {
  const navRef = React.useRef();
  const { scheme, colors } = useTheme();
  const theme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.bg,
      card: colors.cell,
      text: colors.label,
      border: colors.sep,
      primary: colors.brand,
    },
  };
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
        <Stack.Screen name="AiChat" component={AiChatScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
        <Stack.Screen
          name="Edit"
          component={EditScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Paywall" component={PaywallScreen} />
        <Stack.Screen name="Reminder" component={ReminderScreen} />
        <Stack.Screen
          name="ShareCard"
          component={ShareCardScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="RecentlyDeleted" component={RecentlyDeletedScreen} />
        <Stack.Screen name="WidgetPicker" component={WidgetPickerScreen} />
        <Stack.Screen name="Categories" component={CategoriesScreen} />
        <Stack.Screen
          name="CategoryEdit"
          component={CategoryEditScreen}
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
