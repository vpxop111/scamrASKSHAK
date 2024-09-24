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
      const res = await fetch(`https://www.ipqualityscore.com/api/json/url/TxH6zFytLbaR1rBs37R8PV7iqjK9Ru1w/${encodeURIComponent(url)}`, {
        method: 'GET', // Change to GET method
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
              <Text className="text-base text-gray-300">Message: {response.message}</Text>
              <Text className="text-base text-gray-300">Success: {response.success ? 'Yes' : 'No'}</Text>
              <Text className="text-base text-gray-300">Unsafe: {response.unsafe ? 'Yes' : 'No'}</Text>
              <Text className="text-base text-gray-300">Domain: {response.domain}</Text>
              <Text className="text-base text-gray-300">IP Address: {response.ip_address}</Text>
              <Text className="text-base text-gray-300">Server: {response.server}</Text>
              <Text className="text-base text-gray-300">Status Code: {response.status_code}</Text>
              <Text className="text-base text-gray-300">Risk Score: {response.risk_score}</Text>
              <Text className="text-base text-gray-300">Final URL: {response.final_url}</Text>
              <Text className="text-base text-gray-300">Scanned URL: {response.scanned_url}</Text>
              <Text className="text-base text-gray-300">Domain Trust: {response.domain_trust}</Text>
              <Text className="text-base text-gray-300">Domain Age: {response.domain_age.human}</Text>
              <Text className="text-base text-gray-300">DNS Valid: {response.dns_valid ? 'Yes' : 'No'}</Text>
              <Text className="text-base text-gray-300">Suspicious: {response.suspicious ? 'Yes' : 'No'}</Text>
              {/* Add more fields as necessary */}
            </View>
          )
        )}
        {loading && <ActivityIndicator size="large" color="#ddff00" className="mt-4" />}
      </View>
    </View>
  );
};

export default Websitedetection;