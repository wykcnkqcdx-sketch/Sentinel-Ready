import { Tabs } from 'expo-router';
import { Activity, Battery, CalendarDays, ClipboardEdit, Dumbbell, Map, Target } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="log"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#040d08',
          borderTopColor: '#1a2e22',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#a8ffb8',
        tabBarInactiveTintColor: '#466350',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
        },
      }}
    >
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, size }) => <ClipboardEdit color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="training"
        options={{
          title: 'Training',
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="ruck"
        options={{
          title: 'Ruck',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="tests"
        options={{
          title: 'Tests',
          tabBarIcon: ({ color, size }) => <Target color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="recovery"
        options={{
          title: 'Recovery',
          tabBarIcon: ({ color, size }) => <Battery color={color} size={size} />,
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
