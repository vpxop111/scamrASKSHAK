import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import axios from 'axios'; // Import axios for making HTTP requests

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
            Authorization: `Bearer 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`,
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
    <View style={styles.messageContainer}>
      <Text
        style={item.role === 'user' ? styles.userMessage : styles.aiMessage}>
        {item.content}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={chatHistory}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        style={styles.chatList}
      />
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
        />
        <Button title="Send" onPress={handleSend} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  chatList: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    marginRight: 10,
  },
  messageContainer: {
    marginVertical: 5,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    padding: 10,
    borderRadius: 5,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
    padding: 10,
    borderRadius: 5,
  },
});

export default Scamai;
