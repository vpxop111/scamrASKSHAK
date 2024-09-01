import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  BackHandler,
  AppState,
  PermissionsAndroid,
  FlatList,
  StatusBar,
  Platform,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '../supabase';
import {AuthContext} from '../AuthContext';

const Sms = () => {
  const {user} = useContext(AuthContext);
  const [latestSms, setLatestSms] = useState('');
  const [smsSender, setSmsSender] = useState('');
  const [predictedResult, setPredictedResult] = useState('');
  const [apiStatus, setApiStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [lastProcessedSmsId, setLastProcessedSmsId] = useState(null);
  const [scamMessages, setScamMessages] = useState([]);

  useEffect(() => {
    requestReadSmsPermission();
    fetchScamMessages();
    setupNotifications();

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

  const setupNotifications = () => {
    PushNotification.configure({
      onRegister: token => {
        console.log('TOKEN:', token);
      },
      onNotification: notification => {
        console.log('NOTIFICATION:', notification);
        notification.finish(PushNotification.FetchResult.NoData);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    PushNotification.createChannel(
      {
        channelId: 'default-channel-id',
        channelName: 'Default channel',
        channelDescription: 'A default channel for SMS scanner notifications',
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      created => console.log(`createChannel returned '${created}'`),
    );
  };

  const onBackPress = () => {
    if (isTaskRunning) {
      Alert.alert(
        'Background Task Running',
        'The background task is still running. Do you want to stop it and exit?',
        [
          {text: 'Cancel', style: 'cancel'},
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
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'Read SMS Permission',
          message: 'This app needs access to your SMS messages to read them.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('SMS permission granted');
      } else {
        console.log('SMS permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
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
          if (messageId !== lastProcessedSmsId) {
            setLastProcessedSmsId(messageId);
            setLatestSms(latestMessage);
            setSmsSender(sender);
            await sendMessageToApi({message: latestMessage, sender});
            // Store message ID to avoid re-processing
            await AsyncStorage.setItem('lastProcessedSmsId', messageId);
          }
        }
      },
    );
  };

  const sendMessageToApi = async ({message, sender}) => {
    setProcessing(true);
    try {
      const response = await fetch(
        'https://varun324242-sssssss.hf.space/predict',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({message, sender}),
        },
      );

      if (!response.ok) {
        console.error('Network error:', await response.text());
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      console.log('API Response:', result);
      setPredictedResult(result.predicted_result);
      setApiStatus('Success');

      if (result.predicted_result.toLowerCase() === 'scam') {
        setModalVisible(true);
        await storeScamSms(sender, message);
        await storeScamMessage(sender, message);

        PushNotification.localNotification({
          channelId: 'default-channel-id',
          title: 'Scam SMS Detected',
          message: `Scam SMS from ${sender}`,
          bigText: `Message: ${message}`,
          importance: 'high',
          priority: 'high',
          ignoreInForeground: false,
        });
      }
    } catch (error) {
      console.error('Error sending message to API: ', error);
      setPredictedResult('Error sending message to API');
      setApiStatus('Error sending message to API');
    } finally {
      setProcessing(false);
    }
  };

  const storeScamMessage = async (phoneNumber, message) => {
    try {
      if (!user || !user.email) {
        console.error('User email not found');
        return;
      }

      if (typeof phoneNumber !== 'string') {
        console.error('Invalid phone number type');
        return;
      }

      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

      const {data, error} = await supabase
        .from('scamsms')
        .insert([
          {scam_no: cleanPhoneNumber, scam_mes: message, sid: user.email},
        ]);

      if (error) {
        if (error.code === '23505') {
          console.log('Scam message already exists in the database.');
        } else {
          throw error;
        }
      } else {
        console.log('Scam message successfully stored in scammers.');
      }
    } catch (error) {
      console.error('Error storing scam message in scammers: ', error);
    }
  };

  const storeScamSms = async (sender, message) => {
    try {
      const {data, error} = await supabase
        .from('scamsms')
        .insert([{scam_sms: sender, scam_message: message}]);

      if (error) {
        console.error('Error storing scam SMS in Supabase:', error);
      } else {
        console.log('Scam SMS successfully stored.');
      }
    } catch (error) {
      console.error('Error storing scam SMS:', error);
    }
  };

  const fetchScamMessages = async () => {
    try {
      if (!user || !user.email) {
        console.error('User email not found');
        return;
      }

      const {data, error} = await supabase
        .from('scamsms')
        .select('*')
        .eq('sid', user.email);

      if (error) {
        console.error('Error fetching scam messages:', error);
      } else {
        setScamMessages(data);
      }
    } catch (error) {
      console.error('Error fetching scam messages:', error);
    }
  };

  const deleteScamMessage = async id => {
    try {
      const {error} = await supabase.from('scamsms').delete().eq('id', id);

      if (error) {
        console.error('Error deleting scam message:', error);
      } else {
        console.log('Scam message successfully deleted.');
        fetchScamMessages();
      }
    } catch (error) {
      console.error('Error deleting scam message:', error);
    }
  };

  const veryIntensiveTask = async () => {
    const options = {
      taskName: 'SMS Scanner',
      taskTitle: 'SMS Scanner',
      taskDesc: 'Scanning for spam SMS...',
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#ff00ff',
      parameters: {
        delay: 180000, // Check every 60 seconds
      },
    };
    await BackgroundService.start(async taskDataArguments => {
      const {delay} = taskDataArguments;

      await new Promise(async resolve => {
        while (BackgroundService.isRunning()) {
          readLatestSMS(); // Read latest SMS
          await sleep(delay);
        }
        resolve();
      });
    }, options);
  };

  const sleep = time =>
    new Promise(resolve => setTimeout(() => resolve(), time));

  const startTask = async () => {
    if (!isTaskRunning) {
      setIsTaskRunning(true);
      await veryIntensiveTask();
      showPersistentNotification();
    }
  };

  const stopTask = async () => {
    await BackgroundService.stop();
    setIsTaskRunning(false);
    removePersistentNotification();
  };

  const showPersistentNotification = () => {
    PushNotification.localNotification({
      channelId: 'default-channel-id',
      title: 'SMS Scanner Active',
      message: 'Scanning for spam SMS in the background',
      ongoing: true,
      autoCancel: false,
      importance: 'high',
      priority: 'high',
    });
  };

  const removePersistentNotification = () => {
    PushNotification.cancelAllLocalNotifications();
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{padding: 20}}>
        <View className="mb-4">
          <TouchableOpacity
            onPress={isTaskRunning ? stopTask : startTask}
            className="bg-[#ddff00] p-4 rounded-lg mt-10 mb-">
            <Text className="text-black text-center text-lg font-bold">
              {isTaskRunning ? 'Stop Scanning' : 'Start Scanning'}
            </Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={scamMessages}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => (
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
