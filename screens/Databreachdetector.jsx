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
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch data. Please try again.');
    }
  };

  return (
    <View className="flex-1 justify-center items-center p-4 bg-gray-100">
      <Text className="text-xl font-bold mb-6">Check Data Breach</Text>
      
      {/* Option to choose email or username */}
      <View className="flex-row mb-4">
        <TouchableOpacity
          className={`px-4 py-2 rounded-full ${type === 'email' ? 'bg-blue-500' : 'bg-gray-300'}`}
          onPress={() => setType('email')}
        >
          <Text className={`${type === 'email' ? 'text-white' : 'text-black'}`}>Email</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-4 py-2 ml-4 rounded-full ${type === 'username' ? 'bg-blue-500' : 'bg-gray-300'}`}
          onPress={() => setType('username')}
        >
          <Text className={`${type === 'username' ? 'text-white' : 'text-black'}`}>Username</Text>
        </TouchableOpacity>
      </View>

      {/* Input field for email or username */}
      <TextInput
        className="w-full p-3 bg-white rounded-lg mb-4 border border-gray-300"
        placeholder={type === 'email' ? 'Enter Email' : 'Enter Username'}
        value={input}
        onChangeText={setInput}
        keyboardType={type === 'email' ? 'email-address' : 'default'}
      />

      {/* Submit button */}
      <TouchableOpacity
        className="w-full p-3 bg-blue-500 rounded-lg"
        onPress={handleCheck}
      >
        <Text className="text-center text-white font-bold">Check Data Breach</Text>
      </TouchableOpacity>
    </View>
  );
};

export default DataBreachChecker;
