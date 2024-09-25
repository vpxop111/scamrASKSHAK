import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';

const DataBreachChecker = () => {
  const [input, setInput] = useState('');
  const [type, setType] = useState('email'); // 'email' or 'username'

  const handleCheck = async () => {
    if (!input) {
      Alert.alert('Error', 'Please enter a valid input.');
      return;
    }

    try {
      let apiUrl = '';
      if (type === 'email') {
        apiUrl = `https://www.ipqualityscore.com/api/json/leaked/email/TxH6zFytLbaR1rBs37R8PV7iqjK9Ru1w/${input}`;
      } else {
        apiUrl = `https://www.ipqualityscore.com/api/json/leaked/username/TxH6zFytLbaR1rBs37R8PV7iqjK9Ru1w/${input}`;
      }

      const response = await axios.get(apiUrl);
      
      // Log the API response
      console.log('API Response:', response.data);

      // Handle the API response
      const result = response.data;
      if (result.success) {
        Alert.alert('Data Breach Info', `Breach Status: ${result.found ? 'Breached' : 'Safe'}`);
        setInput(''); // Clear the input field after receiving the result
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch data. Please try again.');
    }
  };

  return (
    <View className="flex-1 justify-center items-center p-4 bg-black">
      <Text className="text-xl font-bold mb-6 text-[#ddff00]">Check Data Breach</Text>
      
      {/* Option to choose email or username */}
      <View className="flex-row mb-4">
        <TouchableOpacity
          className={`px-4 py-2 rounded-full ${type === 'email' ? 'bg-[#ddff00]' : 'bg-gray-700'}`}
          onPress={() => {
            setType('email');
            setInput(''); // Clear the input field when switching to email
          }}
        >
          <Text className={`${type === 'email' ? 'text-black' : 'text-[#ddff00]'}`}>Email</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-4 py-2 ml-4 rounded-full ${type === 'username' ? 'bg-[#ddff00]' : 'bg-gray-700'}`}
          onPress={() => {
            setType('username');
            setInput(''); // Clear the input field when switching to username
          }}
        >
          <Text className={`${type === 'username' ? 'text-black' : 'text-[#ddff00]'}`}>Username</Text>
        </TouchableOpacity>
      </View>

      {/* Input field for email or username */}
      <TextInput
        className="w-full p-3 bg-gray-800 text-[#ddff00] rounded-lg mb-4 border border-gray-600"
        placeholder={type === 'email' ? 'Enter Email' : 'Enter Username'}
        value={input}
        onChangeText={setInput}
        keyboardType={type === 'email' ? 'email-address' : 'default'}
      />

      {/* Submit button */}
      <TouchableOpacity
        className="w-full p-3 bg-[#ddff00] rounded-lg"
        onPress={handleCheck}
      >
        <Text className="text-center text-black font-bold">Check Data Breach</Text>
      </TouchableOpacity>
    </View>
  );
};

export default DataBreachChecker;
