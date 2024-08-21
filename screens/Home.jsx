import React, {useEffect, useState} from 'react';
import {Text, View, TouchableOpacity} from 'react-native';
import {auth} from '../firebase'; // Import your Firebase configuration or auth object
import {useAuthState} from 'react-firebase-hooks/auth'; // Import useAuthState
import {supabase} from '../supabase';
import {useNavigation, useRoute} from '@react-navigation/native';

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users] = useAuthState(auth);
  const navigation = useNavigation();
  const route = useRoute();
  const {paramName} = route.params || {}; // Handle cases where params might be undefined

  useEffect(() => {
    // Check if there's a user signed in
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUser(user);
        console.log('User email:', user.email);
        console.log('User UID:', user.uid);
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      const {error} = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      // Redirect to the login screen or perform any other action after logout
      navigation.navigate('Login');
    } catch (error) {
      console.error('Logout error:', error.message);
      // Handle logout error, if any
    }
  };

  return (
    <View className="flex flex-col h-full bg-black">
      <View className="flex flex-col mt-5  bg-black ml-2">
        <View className="flex flex-row mx-5">
          <View className="flex flex-row">
            <Text className="text-[#ddff00] text-2xl font-bold">S</Text>
            <Text className="text-2xl font-bold text-white">camRakshak</Text>
          </View>
          <Text className="text-2xl font-bold ml-20 pl-20 text-white">
            Noti
          </Text>
        </View>
      </View>
      <View className="pt-5 pb-6 bg-[#404040] mx-5 mt-10 rounded-2xl flex flex-col">
        <View className="flex flex-row ml-3 mb-3">
          <Text className="text-[#ddff00] text-2xl font-bold">Good</Text>
          <Text className="text-white text-2xl font-bold ml-1">Morning</Text>
          <Text className="text-[#ddff00] text-2xl font-bold">!!</Text>
        </View>
        <View>
          <Text className="text-[#ddff00] text-2xl font-bold ml-3">
            Explore ScamRakshak
          </Text>
        </View>
      </View>
      <View className="h-12 w-full mx-5 border border-white mt-8 flex flex-row">
        <Text className="text-[#FFB200] text-xl font-semibold ml-8 mt-2">
          Likely
        </Text>
        <Text className="text-white text-xl font-semibold ml-2 mt-2">23</Text>
        <Text className="text-red-500 text-xl font-semibold ml-20 pl-10 mt-2">
          Scam
        </Text>
        <Text className="text-white text-xl font-semibold ml-4 mt-2">2</Text>
      </View>
      <View className="mx-5 flex flex-col mt-8">
        <Text className="text-white text-xl font-bold">Features</Text>

        <TouchableOpacity
          className="bg-[#929292] h-20 w-full mt-5"
          onPress={() => {
            navigation.navigate('website');
          }}>
          <Text className="ml-4 mt-6 text-2xl text-white font-semibold">
            Website
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-[#929292] h-20 w-full mt-5"
          onPress={() => {
            navigation.navigate('sms');
          }}>
          <Text className="ml-4 mt-6 text-2xl text-white font-semibold">
            SMS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-[#929292] h-20 w-full mt-5"
          onPress={() => {
            navigation.navigate('phone');
          }}>
          <Text className="ml-4 mt-6 text-2xl text-white font-semibold">
            Phone Call
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-[#929292] h-20 w-full mt-5"
          onPress={() => {
            navigation.navigate('gmail');
          }}>
          <Text className="ml-4 mt-6 text-2xl text-white font-semibold">
            Gmail
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-[#929292] h-20 w-full mt-5"
          onPress={() => {
            navigation.navigate('news');
          }}>
          <Text className="ml-4 mt-6 text-2xl text-white font-semibold">
            Scam News
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
