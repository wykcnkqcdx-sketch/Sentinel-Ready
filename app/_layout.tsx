import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TrainingProvider } from '@/src/screens/TrainingContext';
import { UserProvider } from '@/src/screens/UserContext';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('AppErrorBoundary caught an error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 16 }}>Something went wrong. Please restart the app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <UserProvider>
        <TrainingProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: '#080c05',
                maxWidth: 800,
                width: '100%',
                alignSelf: 'center',
              },
            }}
          >
            <Stack.Screen name="(tabs)" />
          </Stack>

          <StatusBar style="light" />
        </TrainingProvider>
      </UserProvider>
    </AppErrorBoundary>
  );
}
