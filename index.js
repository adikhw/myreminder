// This entry point exists so the notification background task is defined
// before Expo Router mounts anything. When Android runs a headless JS runtime
// for a notification action, route files such as `src/app/_layout.tsx` are
// never evaluated, so defining the task there would leave the buttons dead.
import './src/notifications';

import 'expo-router/entry';
