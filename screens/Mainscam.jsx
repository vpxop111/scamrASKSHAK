import {View, Text, Button, Touchable} from 'react-native';
import React from 'react';
import {TouchableOpacity} from 'react-native-gesture-handler';

const Mainscam = ({navigation, route}) => {
  const {stype} = route.params;
  return (
    <View className="flex justify-center items-center gap-3  bg-[#0D0E10] min-h-full">
      <TouchableOpacity
        onPress={() => {
          navigation.navigate('scamlist', {stype1: stype});
        }}
        className="bg-[#ddff00] p-4 text-black">
        <Text className="text-xl font-semibold">Scams</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-[#ddff00] p-4 text-black"
        onPress={() => {
          navigation.navigate('solution', {stype1: stype});
        }}
        title="Solution">
        <Text className="text-xl font-semibold">Solution</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-[#ddff00] p-4 text-black"
        onPress={() => {
          navigation.navigate('i_law', {stype1: stype});
        }}
        title="indian_law">
        <Text className="text-xl font-semibold">indian_law</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-[#ddff00] p-4 text-black"
        onPress={() => {
          navigation.navigate('u_law', {stype1: stype});
        }}
        title="usa_law">
        <Text className="text-xl font-semibold">usa_law</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-[#ddff00] p-4 text-black"
        onPress={() => {
          navigation.navigate('resource', {stype1: stype});
        }}
        title="Resources">
        <Text className="text-xl font-semibold">Resources</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Mainscam;
