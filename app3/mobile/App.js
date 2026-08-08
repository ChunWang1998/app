import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Syne_700Bold } from '@expo-google-fonts/syne';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
} from '@expo-google-fonts/ibm-plex-sans';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import ListingsScreen from './src/screens/ListingsScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import RewardsScreen from './src/screens/RewardsScreen';
import AccountScreen from './src/screens/AccountScreen';
import { colors, spacing } from './src/theme';

function MainShell() {
  const insets = useSafeAreaInsets();
  const { session, loading, configured } = useAuth();
  const [tab, setTab] = useState('listings');
  const [listingId, setListingId] = useState(null);

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.mint} size="large" />
      </View>
    );
  }

  if (!configured || !session) {
    return <AuthScreen />;
  }

  if (listingId) {
    return (
      <ListingDetailScreen
        listingId={listingId}
        onBack={() => setListingId(null)}
        onRedeemed={() => {
          setListingId(null);
          setTab('rewards');
        }}
      />
    );
  }

  return (
    <View style={[styles.shell, { paddingTop: insets.top + 8 }]}>
      <View style={styles.content}>
        {tab === 'listings' ? (
          <ListingsScreen active onOpenListing={setListingId} />
        ) : null}
        {tab === 'rewards' ? <RewardsScreen active /> : null}
        {tab === 'account' ? <AccountScreen /> : null}
      </View>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {[
          { key: 'listings', label: '案件' },
          { key: 'rewards', label: '獎勵' },
          { key: 'account', label: '帳號' },
        ].map((item) => {
          const on = tab === item.key;
          return (
            <Pressable
              key={item.key}
              style={styles.tabItem}
              onPress={() => setTab(item.key)}
            >
              <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{item.label}</Text>
              {on ? <View style={styles.tabDot} /> : <View style={styles.tabDotPlaceholder} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Syne_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.mint} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <MainShell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  shell: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
    paddingTop: 10,
    paddingHorizontal: spacing.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontFamily: 'IBMPlexSans_500Medium',
    fontSize: 14,
    color: colors.inkSoft,
  },
  tabLabelOn: {
    color: colors.ink,
  },
  tabDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.mint,
  },
  tabDotPlaceholder: {
    width: 5,
    height: 5,
  },
});
