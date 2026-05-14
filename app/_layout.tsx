import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
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
    </>
  );
}
