import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {Link, useNavigation, useRoute} from '@react-navigation/native';

const BottomNavigation = () => {
  return (
    <View className="flex-row justify-around items-center bg-[#0D0E10] py-2.5 px-1.5 border-t border-t-[#2c3e50]">
      <TouchableOpacity className="flex-1 items-center justify-center">
        <Link to="/">
          <View>
            <Text className="text-2xl mb-1">🏠</Text>
            <Text className="text-xs 'text-[#3498db] font-bold text-white">
              Home
            </Text>
          </View>
        </Link>
      </TouchableOpacity>

      <TouchableOpacity className="flex-1 items-center justify-center">
        <Link to="/news">
          <View>
            <Text className="text-2xl mb-1">📰</Text>
            <Text className="text-xs 'text-[#3498db] font-bold text-white ">
              News
            </Text>
          </View>
        </Link>
      </TouchableOpacity>

      <TouchableOpacity className="flex-1 items-center justify-center">
        <Link to="/ai">
          <View>
            <Text className="text-2xl mb-1">🤖</Text>
            <Text className="text-xs 'text-[#3498db] font-bold text-white">
              Scam AI
            </Text>
          </View>
        </Link>
      </TouchableOpacity>

      <TouchableOpacity className="flex-1 items-center justify-center">
        <Link to="/scams">
          <View>
            <Text className="text-2xl mb-1">🛡️</Text>
            <Text className="text-xs 'text-[#3498db] font-bold text-white">
              Scams
            </Text>
          </View>
        </Link>
      </TouchableOpacity>
    </View>
  );
};

export default BottomNavigation;
