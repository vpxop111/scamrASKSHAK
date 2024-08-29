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
  StatusBar,
  PermissionsAndroid,
  FlatList,
  Platform,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from './supabase';
import {AuthContext} from './AuthContext';

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
  const [countdown, setCountdown] = useState(20);
  const [scamMessages, setScamMessages] = useState([]);

  useEffect(() => {
    requestReadSmsPermission();
    fetchScamMessages();
    setupNotifications();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );
    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    let timer;
    if (isTaskRunning && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prevCount => prevCount - 1);
      }, 1000);
    } else if (countdown === 0) {
      readLatestSMS();
      setCountdown(20);
    }

    return () => {
      backHandler.remove();
      appStateSubscription.remove();
      clearInterval(timer);
    };
  }, [isTaskRunning, countdown]);

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

  const handleAppStateChange = nextAppState => {
    if (nextAppState === 'background' && isTaskRunning) {
      console.log('App is in background, background task continues running');
    }
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

  const readLatestSMS = () => {
    SmsAndroid.list(
      JSON.stringify({
        box: 'inbox',
        indexFrom: 0,
        maxCount: 1,
      }),
      fail => {
        console.log('Failed with this error: ' + fail);
      },
      (count, smsList) => {
        const messages = JSON.parse(smsList);
        if (messages.length > 0) {
          const latestMessage = messages[0].body;
          const sender = messages[0].address;
          const messageId = messages[0]._id;

          if (messageId !== lastProcessedSmsId) {
            setLastProcessedSmsId(messageId);
            setLatestSms(latestMessage);
            setSmsSender(sender);
            sendMessageToApi({message: latestMessage, sender});
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

  const veryIntensiveTask = async taskDataArguments => {
    const {delay} = taskDataArguments;
    await new Promise(async resolve => {
      for (let i = 0; BackgroundService.isRunning(); i++) {
        await readLatestSMS();
        await sleep(delay);
      }
    });
  };

  const sleep = time =>
    new Promise(resolve => setTimeout(() => resolve(), time));

  const options = {
    taskName: 'SMS Scanner',
    taskTitle: 'SMS Scanner',
    taskDesc: 'Scanning for spam SMS...',
    taskIcon: {
      name: 'ic_launcher',
      type: 'mipmap',
    },
    color: '#ff00ff',
    linkingURI: 'yourSchemeHere://chat/jane',
    parameters: {
      delay: 60000,
    },
  };

  const startTask = async () => {
    if (!isTaskRunning) {
      setIsTaskRunning(true);
      await BackgroundService.start(veryIntensiveTask, options);
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView>
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={isTaskRunning ? stopTask : startTask}>
            <Text style={styles.buttonText}>
              {isTaskRunning ? 'Stop Scanning' : 'Start Scanning'}
            </Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={scamMessages}
          keyExtractor={item => item.id.toString()}
          renderItem={({item}) => (
            <View style={styles.messageContainer}>
              <Text>Sender: {item.scam_no}</Text>
              <Text>Message: {item.scam_mes}</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteScamMessage(item.id)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </ScrollView>
      <Modal visible={modalVisible} transparent={true}>
        <View style={styles.modalView}>
          <Text style={styles.modalText}>Scam SMS detected!</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setModalVisible(false)}>
            <Text style={styles.textStyle}>OK</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  buttonContainer: {
    padding: 20,
  },
  buttonText: {
    fontSize: 20,
    color: '#ffffff',
    backgroundColor: '#007bff',
    padding: 10,
    textAlign: 'center',
    borderRadius: 5,
  },
  messageContainer: {
    backgroundColor: '#e1e1e1',
    padding: 15,
    marginVertical: 10,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: '#ff4d4d',
    padding: 10,
    marginTop: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  modalView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalText: {
    color: '#ffffff',
    fontSize: 24,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    padding: 10,
    elevation: 2,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default Sms;
