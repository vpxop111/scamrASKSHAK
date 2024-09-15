import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation

const BottomNavigation = () => {
  const navigation = useNavigation(); // Get navigation object

  return (
    <View className="flex-row justify-around items-center bg-[#0D0E10] py-2.5 px-1.5 border-t border-t-[#2c3e50]">
      <TouchableOpacity className="flex-1 items-center justify-center" onPress={() => navigation.navigate('Home')}>
        <View>
          <Text className="text-2xl mb-1">🏠</Text>
          <Text className="text-xs text-[#3498db] font-bold text-white">Home</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity className="flex-1 items-center justify-center" onPress={() => navigation.navigate('news')}>
        <View>
          <Text className="text-2xl mb-1">📰</Text>
          <Text className="text-xs text-[#3498db] font-bold text-white">News</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity className="flex-1 items-center justify-center" onPress={() => navigation.navigate('ai')}>
        <View>
          <Text className="text-2xl mb-1">🤖</Text>
          <Text className="text-xs text-[#3498db] font-bold text-white">Scam AI</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity className="flex-1 items-center justify-center" onPress={() => navigation.navigate('scam')}>
        <View>
          <Text className="text-2xl mb-1">🛡️</Text>
          <Text className="text-xs text-[#3498db] font-bold text-white">Scams</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default BottomNavigation;
