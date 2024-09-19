import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Modal,
  BackHandler,
  FlatList,
  StatusBar,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { AuthContext } from '../AuthContext';
import { BackgroundTaskContext } from '../BackgroundTaskContext'; // Import the BackgroundTaskContext

const Sms = () => {
  const { user } = useContext(AuthContext);
  const { isTaskRunning, startTask, stopTask } = useContext(BackgroundTaskContext); // Use the context
  const [latestSms, setLatestSms] = useState('');
  const [smsSender, setSmsSender] = useState('');
  const [predictedResult, setPredictedResult] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [scamMessages, setScamMessages] = useState([]);

  useEffect(() => {
    requestReadSmsPermission();
    fetchScamMessages();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => {
      backHandler.remove();
      if (isTaskRunning) {
        stopTask();
      }
    };
  }, []);

  const onBackPress = () => {
    if (isTaskRunning) {
      Alert.alert(
        'Background Task Running',
        'The background task is still running. Do you want to stop it and exit?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Stop and Exit',
            onPress: async () => {
              await stopTask();
              BackHandler.exitApp();
            },
          },
        ],
      );
      return true;
    }
    return false;
  };

  const requestReadSmsPermission = async () => {
    // Request SMS read permission
  };

  const readLatestSMS = async () => {
    SmsAndroid.list(
      JSON.stringify({
        box: 'inbox',
        indexFrom: 0,
        maxCount: 1,
      }),
      fail => {
        console.log('Failed with this error: ' + fail);
      },
      async (count, smsList) => {
        const messages = JSON.parse(smsList);
        if (messages.length > 0) {
          const latestMessage = messages[0].body;
          const sender = messages[0].address;
          const messageId = messages[0]._id;

          // Only proceed if the message ID is new
          setLatestSms(latestMessage);
          setSmsSender(sender);
          await sendMessageToApi({ message: latestMessage, sender });
        }
      },
    );
  };

  const sendMessageToApi = async ({ message, sender }) => {
    // Send the SMS message to the API for processing
  };

  const fetchScamMessages = async () => {
    // Fetch scam messages from the database
  };

  const toggleTask = () => {
    if (isTaskRunning) {
      stopTask();
    } else {
      startTask(readLatestSMS); // Start the background task with the SMS reading function
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="mb-4">
          <TouchableOpacity
            onPress={toggleTask}
            className="bg-[#ddff00] p-4 rounded-lg mt-10 mb-">
            <Text className="text-black text-center text-lg font-bold">
              {isTaskRunning ? 'Stop Scanning' : 'Start Scanning'}
            </Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={scamMessages}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <View className="bg-gray-800 p-4 mb-2 rounded-lg">
              <Text className="text-white font-semibold">
                Sender: {item.scam_no}
              </Text>
              <Text className="text-gray-300">Message: {item.scam_mes}</Text>
              <TouchableOpacity
                onPress={() => deleteScamMessage(item.id)}
                className="mt-2 bg-red-600 p-2 rounded-lg">
                <Text className="text-white text-center">Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </ScrollView>
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View className="flex-1 justify-center items-center bg-black bg-opacity-70">
          <View className="bg-white p-6 rounded-lg">
            <Text className="text-lg font-semibold">Scam SMS detected!</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="mt-4 bg-blue-500 p-2 rounded-lg">
              <Text className="text-white text-center">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Sms;