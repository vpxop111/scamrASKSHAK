import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Modal,
  BackHandler,
  FlatList,
  StatusBar,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { supabase } from '../supabase';
import { AuthContext } from '../AuthContext';
import { BackgroundTaskContext } from '../BackgroundTaskContext';

const Sms = () => {
  const { user } = useContext(AuthContext);
  const { isTaskRunning, startTask, stopTask } = useContext(BackgroundTaskContext);
  const [latestSms, setLatestSms] = useState('');
  const [smsSender, setSmsSender] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [scamMessages, setScamMessages] = useState([]);

  useEffect(() => {
    requestReadSmsPermission();
    fetchScamMessages();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    // Subscribe to real-time updates
    const channel = supabase.channel(`public:scamsms`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'scamsms',
      }, payload => {
        console.log('Change received!', payload);
        fetchScamMessages(); // Refresh the list after any change
      })
      .subscribe();

    return () => {
      backHandler.remove();
      if (isTaskRunning) {
        stopTask();
      }
      supabase.removeChannel(channel); // Clean up the subscription
    };
  }, [user]);

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
    console.log('Requesting SMS read permission...');
    // Implement permission request logic here
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

          setLatestSms(latestMessage);
          setSmsSender(sender);
          await sendMessageToApi({ message: latestMessage, sender });
        }
      },
    );
  };

  const sendMessageToApi = async ({ message, sender }) => {
    console.log('Sending message to API:', { message, sender });
    // Send the SMS message to the API for processing
  };

  const fetchScamMessages = async () => {
    console.log('Fetching scam messages...');
    try {
      if (!user || !user.email) {
        console.error('User email not found');
        return;
      }

      const { data, error } = await supabase
        .from('scamsms')
        .select('*')
        .eq('sid', user.email);

      if (error) {
        console.error('Error fetching scam messages:', error);
      } else {
        console.log('Fetched scam messages:', data);
        setScamMessages(data);
      }
    } catch (error) {
      console.error('Error fetching scam messages:', error);
    }
  };

  const deleteScamMessage = async id => {
    console.log('Deleting scam message with ID:', id);
    try {
      const { error } = await supabase.from('scamsms').delete().eq('id', id);

      if (error) {
        console.error('Error deleting scam message:', error);
      } else {
        console.log('Scam message successfully deleted.');
        fetchScamMessages(); // Refresh the list after deletion
      }
    } catch (error) {
      console.error('Error deleting scam message:', error);
    }
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
        ListHeaderComponent={
          <View className="mb-4">
            <TouchableOpacity
              onPress={toggleTask}
              className="bg-[#ddff00] p-4 rounded-lg mt-10 mb-">
              <Text className="text-black text-center text-lg font-bold">
                {isTaskRunning ? 'Stop Scanning' : 'Start Scanning'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={{ padding: 20 }}
      />
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