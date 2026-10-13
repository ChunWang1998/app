import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import DetailScreen from '../screens/DetailScreen';
import ReminderScreen from '../screens/ReminderScreen';
import EditScreen from '../screens/EditScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PaywallScreen from '../screens/PaywallScreen';
import { useColorScheme } from 'react-native';

const Stack = createNativeStackNavigator();

export default function AppNavigator({ initial }) {
  const scheme = useColorScheme?.() || 'light';
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
  return (
    <NavigationContainer ref={navRef} theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
        <Stack.Screen name="Reminder" component={ReminderScreen} />
        <Stack.Screen name="Edit" component={EditScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Paywall" component={PaywallScreen} />
        <Stack.Screen name="RecentlyDeleted" getComponent={() => require('../screens/RecentlyDeletedScreen').default} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
