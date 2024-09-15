import React, { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native'; // Import TouchableOpacity
import { tw } from 'nativewind';

const Websitedetection = () => {
  const [url, setUrl] = useState('');
  const [response, setResponse] = useState(null); // Use null initially to check if data exists
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setResponse(null); // Reset response

    try {
      const res = await fetch('https://varun324242-sweb.hf.space/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error('Network response was not ok');
      
      const data = await res.json();
      console.log('Response data:', data); // Log the response data to the console
      setResponse(data); // Set response state with full data
    } catch (error) {
      setError('Error fetching data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-black p-4">
      <View className="w-full max-w-md bg-gray-900 p-8 rounded-lg shadow-lg">
        <Text className="text-3xl font-bold mb-6 text-center text-[#ddff00]">URL Checker</Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          className="h-12 border border-gray-700 rounded-md mb-4 px-4 text-base text-gray-300 bg-gray-800"
          placeholder="Enter URL"
          placeholderTextColor="#aaa"
          autoCapitalize="none"
          keyboardType="url"
          returnKeyType="go"
        />
        <TouchableOpacity
          onPress={handleSubmit}
          className={`h-12 rounded-md mb-4 justify-center items-center ${loading ? 'bg-gray-600' : 'bg-[#ddff00]'}`} // Style for TouchableOpacity
          disabled={loading}
        >
          <Text className="text-base font-bold text-center text-black">{loading ? 'Checking...' : 'Check URL'}</Text>
        </TouchableOpacity>
        {error ? (
          <Text className="mt-4 text-red-500 text-center">{error}</Text>
        ) : (
          response && (
            <View className="mt-4 p-4 border border-gray-700 rounded-md bg-gray-800">
              <Text className="text-xl font-semibold mb-2 text-[#ddff00]">Response:</Text>
              <Text className="text-base text-gray-300">URL: {response.url}</Text>
              <Text className="text-base text-gray-300">Prediction: {response.prediction}</Text>
              <Text className="text-base text-gray-300">Probability: {response.probability}</Text>
              {response && response.stype1 && (
                <Text className="text-base text-gray-300">SType1: {response.stype1}</Text>
              )}
            </View>
          )
        )}
        {loading && <ActivityIndicator size="large" color="#ddff00" className="mt-4" />}
      </View>
    </View>
  );
};

export default Websitedetection;
