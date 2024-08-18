import {View, Text, Button} from 'react-native';
import React from 'react';

const Mainscam = ({navigation, route}) => {
  const {stype} = route.params;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
      }}>
      <Button
        onPress={() => {
          navigation.navigate('scamlist', {stype1: stype});
        }}
        title="Scams"
      />

      <Button
        onPress={() => {
          navigation.navigate('solution', {stype1: stype});
        }}
        title="Solution"
      />

      <Button
        onPress={() => {
          navigation.navigate('i_law', {stype1: stype});
        }}
        title="Indian Law"
      />

      <Button
        onPress={() => {
          navigation.navigate('u_law', {stype1: stype});
        }}
        title="USA Law"
      />

      <Button
        onPress={() => {
          navigation.navigate('resource', {stype1: stype});
        }}
        title="Resources"
      />
    </View>
  );
};

export default Mainscam;
