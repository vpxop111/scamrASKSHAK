import React, {useEffect, useContext, useState} from 'react';
import {Text, View, TouchableOpacity} from 'react-native';
import {AuthContext} from '../AuthContext'; // Import AuthContext
import {useNavigation, useRoute} from '@react-navigation/native';
import {ScrollView} from 'react-native-gesture-handler';
import BottomNavigationBar from './BottomNavigation';
import ImageUpload from './ImageUpload'; // {{ edit_1 }}

export default function Home() {
  const {user, signOut} = useContext(AuthContext); // Use AuthContext to get user and signOut
  const navigation = useNavigation();
  const route = useRoute();
  const {paramName} = route.params || {}; // Handle cases where params might be undefine

  useEffect(() => {
    if (user) {
      console.log('User email:', user.email);
      console.log('User UID:', user.uid);
    } else {
      navigation.navigate('Login'); // Redirect to Login if no user
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigation.navigate('Login'); // Redirect to Login after logout
    } catch (error) {
      console.error('Logout error:', error.message);
      // Handle logout error, if any
    }
  };

  return (
    <View className="flex-1 relative">

      <ScrollView className="flex-1 bg-[#0D0E10]">
        <View className="flex flex-col mt-5 bg-transparent ml-2">
          <View className="flex flex-row mx-5 items-center">
            <View className="flex flex-row mt-2">
              <Text className="text-[#ddff00] text-2xl font-bold">S</Text>
              <Text className="text-2xl font-bold text-white">camRakshak</Text>
            </View>
            <TouchableOpacity
              className="bg-[#ddff00] text-black h-12 pr-5 ml-10 rounded-full"
              onPress={handleLogout}>
              <Text className="ml-4 mt-2 text-xl text-black font-semibold">
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="pt-5 pb-6 bg-[#2C2C29] mx-5 mt-10 rounded-2xl flex flex-col">
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
        <View className="h-12  mx-5 border bg-[#2C2C29] border-[#2C2C29] mt-8  flex flex-row rounded-xl">
          <Text className="text-[#FFB200] text-xl font-semibold ml-8 mt-2">
            Likely
          </Text>
          <Text className="text-white text-xl font-semibold ml-2 mt-2">23</Text>
          <Text className="text-red-500 text-xl font-semibold ml-14  mt-2">
            Scam
          </Text>
          <Text className="text-white text-xl font-semibold ml-4 mt-2">2</Text>
        </View>
        <View className="mx-5 flex flex-col mt-8">
          <Text className="text-white text-xl font-medium">Features</Text>
          <TouchableOpacity
            className="bg-[#2C2C29] h-20 w-full mt-5 rounded-2xl"
            onPress={() => {
              navigation.navigate('sms');
            }}>
            <Text className="ml-4 mt-6 text-2xl text-white font-semibold">
              SMS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-[#2C2C29] h-20 w-full mt-5 rounded-2xl"
            onPress={() => {
              navigation.navigate('phone');
            }}>
            <Text className="ml-4 mt-6 text-2xl text-white font-semibold">
              Phone Call
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-[#2C2C29] h-20 w-full mt-5 rounded-2xl"
            onPress={() => {
              navigation.navigate('gmail');
            }}>
            <Text className="ml-4 mt-6 text-2xl text-white font-semibold">
              Gmail
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-[#2C2C29] h-20 w-full mt-5 rounded-2xl"
            onPress={() => {
              navigation.navigate('websitedetection');
            }}>
            <Text className="ml-4 mt-6 text-2xl text-white font-semibold">
              Website
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          className="bg-[#2C2C29] h-20 w-full mt-5 rounded-2xl"
          onPress={() => navigation.navigate('ImageUpload')} 
        >
          <Text className="ml-4 mt-6 text-2xl text-white font-semibold">
            Go to Image Upload
          </Text>
        </TouchableOpacity>
        <ImageUpload /> 
        <BottomNavigationBar />
      </ScrollView>
    </View>
  );
}
