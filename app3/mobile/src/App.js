import React, { useEffect } from 'react';
import { SafeAreaView, View, Text, Button, FlatList } from 'react-native';
import { initRepository, useActivities, addActivity, logActivityNow, softDeleteActivity, undoDelete, importFromJson, exportToJson } from './data/repository';
import { initializeI18n, t } from './i18n';
import { ensureNotificationPermissions, refreshAllReminders } from './notifications/reminders';
import { restoreProUnlock } from './lib/iap';
import { isProUnlocked } from './lib/entitlements';

export default function App() {
  useEffect(() => {
    initializeI18n();
    initRepository().then(() => {
      ensureNotificationPermissions();
    });
  }, []);

  const { activities, ready } = useActivities();

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 12 }}>
        {t('app.title')} — {t('app.placeholderUi')}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <Button title={t('actions.addSample')} onPress={() => addActivity({ title: 'Drink water', reminderDays: 2 })} />
        <Button title={t('actions.refreshReminders')} onPress={() => refreshAllReminders()} />
        <Button title={t('actions.export')} onPress={async () => {
          const blob = await exportToJson();
          console.log('Export:', JSON.stringify(blob, null, 2));
          alert(t('actions.exportedToConsole'));
        }} />
        <Button title={t('actions.restore')} onPress={() => restoreProUnlock()} />
      </View>

      {!ready ? <Text>{t('app.loading')}</Text> : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' }}>
              <Text style={{ fontWeight: '700' }}>
                {item.title} {item.deletedAt ? `(${t('labels.deleted')})` : ''}
              </Text>
              <Text style={{ color: '#666' }}>
                {t('labels.lastDone')}: {item.lastDoneAt ? new Date(item.lastDoneAt).toLocaleString() : t('labels.never')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Button title={t('actions.logNow')} onPress={() => logActivityNow(item.id)} />
                <Button title={t('actions.delete')} onPress={() => softDeleteActivity(item.id)} />
                <Button title={t('actions.undo')} onPress={() => undoDelete(item.id)} />
              </View>
            </View>
          )}
          ListEmptyComponent={<Text>{t('labels.empty')}</Text>}
        />
      )}

      <View style={{ marginTop: 16 }}>
        <ProStatus />
      </View>
    </SafeAreaView>
  );
}

function ProStatus() {
  const [pro, setPro] = React.useState(false);
  useEffect(() => {
    let mounted = true;
    isProUnlocked().then((x) => mounted && setPro(x));
    return () => { mounted = false; };
  }, []);
  return <Text style={{ color: pro ? '#16794D' : '#B54708' }}>{pro ? t('labels.proUnlocked') : t('labels.freeTier')}</Text>;
}
