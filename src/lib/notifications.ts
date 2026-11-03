import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Item } from '@/data/types';
import { dueAt } from './dates';

const CHANNEL = 'todos';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensurePermission() {
  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists.
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'To-do reminders',
      // eslint-disable-next-line import/namespace -- re-exported via export *, verified by tsc
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C5CFF',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function cancelReminder(id: string | null) {
  if (id) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

/** Schedules a reminder at the todo's due time. Returns its id, or null when there is nothing to remind. */
export async function scheduleTodoReminder(item: Pick<Item, 'title' | 'due' | 'due_time'>, petName: string) {
  if (!item.due || !item.due_time) return null;
  const when = dueAt(item.due, item.due_time);
  if (when.getTime() <= Date.now() || !(await ensurePermission())) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ ${item.title}`,
      body: `${petName} says it's time! Finish it in Questie for XP.`,
      data: { kind: 'todo' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
  });
}
