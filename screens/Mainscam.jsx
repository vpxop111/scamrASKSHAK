import {View, Text, Button} from 'react-native';
import React from 'react';

const Mainscam = ({navigation, route}) => {
  const {stype} = route.params;
  return (
    <View className="flex justify-center items-center gap-5 mt-10">
      <Button
        onPress={() => {
          navigation.navigate('scamlist', {stype1: stype});
        }}
        title="Scams"></Button>

      <Button
        onPress={() => {
          navigation.navigate('solution', {stype1: stype});
        }}
        title="Solution"></Button>

      <Button
        onPress={() => {
          navigation.navigate('i_law', {stype1: stype});
        }}
        title="indian_law"></Button>

      <Button
        onPress={() => {
          navigation.navigate('u_law', {stype1: stype});
        }}
        title="usa_law"></Button>

      <Button
        onPress={() => {
          navigation.navigate('resource', {stype1: stype});
        }}
        title="Resources"></Button>
    </View>
  );
};

export default Mainscam;
