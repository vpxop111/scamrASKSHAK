import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View, Alert} from 'react-native';
import {supabase} from '../supabase';

export default function Signup({navigation}) {
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (registerPassword !== confirmPassword) {
      Alert.alert('Passwords do not match');
      return;
    }

    setLoading(true);
    const {error} = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
    });

    if (error) {
      Alert.alert(error.message);
    } else {
      Alert.alert('Please check your inbox for email verification!');
      navigation.navigate('home');
    }
    setLoading(false);
  };

  return (
    <View className="bg-black h-full">
      <View className="flex flex-col mt-20 bg-blakc">
        <View className="flex flex-row pl-8 gap-2">
          <Text className="text-5xl font-bold text-[#ddff00]">Create</Text>
          <Text className="text-5xl font-bold text-white">an</Text>
        </View>
        <Text className="text-5xl font-bold text-white ml-8 mt-2">account</Text>
        <View className="w-[1rem] mr-5 h-20 ml-5 rounded-full border-4 border-[#ddff00] mt-10">
          <TextInput
            className="mt-3 mx-5 text-lg text-white"
            placeholder="Email"
            value={registerEmail}
            placeholderTextColor="#ffffff"
            style={{color: '#ffffff'}}
            onChangeText={text => setRegisterEmail(text)}
          />
        </View>
        <View className="w-[1rem] mr-5 h-20 ml-5 rounded-full border-4 border-[#ddff00] mt-10">
          <TextInput
            className="mt-3 mx-5 text-lg text-white"
            placeholder="Password"
            secureTextEntry
            placeholderTextColor="#ffffff"
            style={{color: '#ffffff'}}
            value={registerPassword}
            onChangeText={text => setRegisterPassword(text)}
          />
        </View>
        <View className="w-[1rem] mr-5 h-20 ml-5 rounded-full border-4 border-[#ddff00] mt-10">
          <TextInput
            className="mt-3 mx-5 text-lg text-white"
            placeholder="Confirm Password"
            secureTextEntry
            placeholderTextColor="#ffffff"
            style={{color: '#ffffff'}}
            value={confirmPassword}
            onChangeText={text => setConfirmPassword(text)}
          />
        </View>
        <View className="flex flex-row justify-center mt-20">
          <TouchableOpacity
            className="p-5 bg-[#ddff00] rounded-full shadow-lg w-60"
            activeOpacity={0.7}
            onPress={register}
            disabled={loading}>
            <Text className="text-black text-center text-2xl font-bold">
              Signup
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
