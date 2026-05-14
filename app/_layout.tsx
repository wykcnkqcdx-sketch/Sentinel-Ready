import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TrainingProvider } from '@/src/screens/TrainingContext';

export default function RootLayout() {
  return (
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
  );
}
