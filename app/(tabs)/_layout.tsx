import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="log"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F1115',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 9,
          paddingTop: 7,
        },
        tabBarActiveTintColor: '#FC4C02',
        tabBarInactiveTintColor: '#A7ADB8',
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '900',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="log"
        options={{
          title: 'Record',
          tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="training"
        options={{
          title: 'Team',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="dumbbell" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="ruck"
        options={{
          title: 'Maps',
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="tests"
        options={{
          title: 'Tests',
          tabBarIcon: ({ color, size }) => <Ionicons name="locate-outline" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="recovery"
        options={{
          title: 'You',
          tabBarIcon: ({ color, size }) => <Ionicons name="battery-half-outline" color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
