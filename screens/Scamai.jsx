import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios'; // Import axios for making HTTP requests
import {TouchableOpacity} from 'react-native-gesture-handler';
import BottomNavigationBar from './BottomNavigation';
const Scamai = () => {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'system',
      content:
        "Hello! I'm your Scam Secure Assistant. Ask me anything about staying safe from scams.",
    },
  ]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message to chat history
    const userMessage = {role: 'user', content: input.trim()};
    setChatHistory(prevChat => [...prevChat, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo', // Use the desired GPT model
          messages: [...chatHistory, userMessage],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer sk-10QNYWx0M0VSNP4WuzKB0KfT2nwl6hixpk44RQQZB9T3BlbkFJJuuxEmtHSIKeMUSr_Zzrvo5YhlUhO6OCDIH_tPumoA`,
          },
        },
      );

      const aiMessage = response.data.choices[0].message;
      setChatHistory(prevChat => [...prevChat, aiMessage]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({item}) => (
    <View className="my-2">
      <Text
        className={`${
          item.role === 'user'
            ? 'self-end bg-[#ddff00]'
            : 'self-start bg-gray-200'
        } p-2 rounded-lg`}>
        {item.content}
      </Text>
      
    </View>
  );

  return (
    <View className="flex-1 p-5 bg-[#0D0E10]">
      <FlatList
        data={chatHistory}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        className="flex-1"
      />
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      <View className="flex-row items-center mt-4">
        <TextInput
          className="flex-1 border-2 text-white border-[#ddff00] rounded-lg p-2 mr-2"
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
        />
        <TouchableOpacity
          onPress={handleSend}
          className="bg-[#ddff00] rounded-xl p-3">
          <Text className=" text-blakc p rounded-lg font-bold">Send</Text>
        </TouchableOpacity>
      </View>
      <BottomNavigationBar />
    </View>
  );
};

export default Scamai;
