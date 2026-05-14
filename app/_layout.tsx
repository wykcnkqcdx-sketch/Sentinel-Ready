import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TrainingProvider } from '@/src/screens/TrainingContext';
import { UserProvider } from '@/src/screens/UserContext';

export default function RootLayout() {
  return (
    <UserProvider>
    <TrainingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: '#07110c',
          },
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>

      <StatusBar style="light" />
    </TrainingProvider>
    </UserProvider>
  );
}
