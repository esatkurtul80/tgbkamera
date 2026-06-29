import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

import type { ColorValue } from 'react-native';

function HomeIcon({ color }: { color: ColorValue }) {
  return (
    <View style={[styles.iconWrap]}>
      <View style={[styles.homeRoof, { borderBottomColor: color as string }]} />
      <View style={[styles.homeBody, { borderColor: color as string }]}>
        <View style={[styles.homeDoor, { backgroundColor: color as string }]} />
      </View>
    </View>
  );
}

function ListIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.line, { backgroundColor: color as string }]} />
      <View style={[styles.line, { backgroundColor: color as string, width: 12 }]} />
      <View style={[styles.line, { backgroundColor: color as string }]} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="liste"
        options={{
          title: 'Değerlendirmeler',
          tabBarIcon: ({ color }) => <ListIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 22,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: 1,
  },
  homeBody: {
    width: 12,
    height: 8,
    borderWidth: 1.5,
    borderRadius: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  homeDoor: {
    width: 4,
    height: 5,
    borderRadius: 1,
  },
  line: {
    height: 2,
    width: 18,
    borderRadius: 1,
    marginVertical: 1.5,
  },
});
