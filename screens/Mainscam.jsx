import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { useTheme } from '../ThemeContext'; // Adjust the import path to your ThemeContext

const Mainscam = ({ navigation, route }) => {
  const { stype } = route.params;
  const { isDarkMode } = useTheme(); // Access dark mode state

  return (
    <View className="flex justify-center items-center gap-3 bg-[#0D0E10] min-h-full">
      <TouchableOpacity
        onPress={() => {
          navigation.navigate('scamlist', { stype1: stype });
        }}
        className="bg-[#ddff00] p-4"
      >
        <Text className={`text-xl font-semibold ${isDarkMode ? 'text-black' : 'text-black'}`}>
          Scams
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-[#ddff00] p-4"
        onPress={() => {
          navigation.navigate('solution', { stype1: stype });
        }}
        title="Solution"
      >
        <Text className={`text-xl font-semibold ${isDarkMode ? 'text-black' : 'text-black'}`}>
          Solution
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-[#ddff00] p-4"
        onPress={() => {
          navigation.navigate('i_law', { stype1: stype });
        }}
        title="indian_law"
      >
        <Text className={`text-xl font-semibold ${isDarkMode ? 'text-black' : 'text-black'}`}>
          indian_law
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-[#ddff00] p-4"
        onPress={() => {
          navigation.navigate('u_law', { stype1: stype });
        }}
        title="usa_law"
      >
        <Text className={`text-xl font-semibold ${isDarkMode ? 'text-black' : 'text-black'}`}>
          usa_law
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-[#ddff00] p-4"
        onPress={() => {
          navigation.navigate('resource', { stype1: stype });
        }}
        title="Resources"
      >
        <Text className={`text-xl font-semibold ${isDarkMode ? 'text-black' : 'text-black'}`}>
          Resources
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Mainscam;
