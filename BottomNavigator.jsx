// BottomTabNavigator.js

import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Home from './Home'; // Import your Home component
import ScamList from './ScamList'; // Import the Scam List component
import SMS from './SMS'; // Import the SMS component
import PhoneCall from './PhoneCall'; // Import the Phone Call component
import Gmail from './Gmail'; // Import the Gmail component
import ScamNews from './ScamNews'; // Import the Scam News component
import ScamAI from './ScamAI'; // Import the Scam AI component

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#ddff00', // Active tab color
        tabBarInactiveTintColor: 'white', // Inactive tab color
        tabBarStyle: {backgroundColor: '#404040'}, // Tab bar background color
        headerShown: false, // Hide header
      }}>
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="ScamList" component={ScamList} />
      <Tab.Screen name="SMS" component={SMS} />
      <Tab.Screen name="PhoneCall" component={PhoneCall} />
      <Tab.Screen name="Gmail" component={Gmail} />
      <Tab.Screen name="ScamNews" component={ScamNews} />
      <Tab.Screen name="ScamAI" component={ScamAI} />
    </Tab.Navigator>
  );
}
