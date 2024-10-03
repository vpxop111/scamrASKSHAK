import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { useTheme } from '../ThemeContext'; // Adjust the import path to your ThemeContext

const Mainscam = ({ navigation, route }) => {
  const { stype } = route.params;
  const { isDarkMode } = useTheme(); // Access dark mode state

  return (
    <View className={`flex justify-center items-center gap-5 bg-[#0D0E10] min-h-full p-5`}>
      <Text className={`text-3xl font-bold text-[#ddff00] mb-5 ${isDarkMode ? 'text-white' : 'text-black'}`}>
        Welcome to Mainscam
      </Text>

      <TouchableOpacity
        onPress={() => {
          navigation.navigate('scamlist', { stype1: stype });
        }}
        className="bg-[#ddff00] p-5 rounded-lg shadow-lg hover:bg-[#cce600] transition duration-300"
      >
        <Text className={`text-xl font-semibold ${isDarkMode ? 'text-black' : 'text-black'}`}>
          Scams
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-[#ddff00] p-5 rounded-lg shadow-lg hover:bg-[#cce600] transition duration-300"
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
        className="bg-[#ddff00] p-5 rounded-lg shadow-lg hover:bg-[#cce600] transition duration-300"
        onPress={() => {
          navigation.navigate('i_law', { stype1: stype });
        }}
        title="indian_law"
      >
        <Text className={`text-xl font-semibold ${isDarkMode ? 'text-black' : 'text-black'}`}>
          Indian Law
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-[#ddff00] p-5 rounded-lg shadow-lg hover:bg-[#cce600] transition duration-300"
        onPress={() => {
          navigation.navigate('u_law', { stype1: stype });
        }}
        title="usa_law"
      >
        <Text className={`text-xl font-semibold ${isDarkMode ? 'text-black' : 'text-black'}`}>
          USA Law
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-[#ddff00] p-5 rounded-lg shadow-lg hover:bg-[#cce600] transition duration-300"
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
