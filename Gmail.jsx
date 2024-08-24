import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from './supabase';
import {useTask} from './TaskContext'; // Import useTask from TaskContext

const Sms = () => {
  const {taskStarted, startTask, stopTask} = useTask(); // Use TaskContext
  const [latestSms, setLatestSms] = useState('');
  const [smsSender, setSmsSender] = useState('');
  const [predictedResult, setPredictedResult] = useState('');
  const [apiStatus, setApiStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isTaskRunning, setIsTaskRunning] = useState(taskStarted); // Sync with context
  const [lastProcessedSmsId, setLastProcessedSmsId] = useState(null);
  const [countdown, setCountdown] = useState(20); // Initial countdown value (in seconds)

  useEffect(() => {
    requestReadSmsPermission();

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
      readLatestSMS(); // Fetch the latest SMS on countdown reaching zero
      setCountdown(20); // Reset the countdown for the next cycle
    }

    return () => {
      backHandler.remove();
      appStateSubscription.remove();
      clearInterval(timer); // Clear the interval on component unmount
    };
  }, [isTaskRunning, countdown]);

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
        'https://varun324242-sssssss.hf.space/predict', // Ensure this API endpoint is correct
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
        await storeScamSms(sender, message);

        // Show notification for detected scam SMS
        PushNotification.localNotification({
          channelId: 'default-channel-id',
          title: 'Scam SMS Detected',
          message: `Scam SMS from ${sender}`,
          bigText: `Message: ${message}`,
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

  const storeScamSms = async (sender, message) => {
    try {
      const {data, error} = await supabase
        .from('SMSMessages')
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

  const veryIntensiveTask = async taskDataArguments => {
    const {delay} = taskDataArguments;
    await new Promise(async resolve => {
      for (let i = 0; BackgroundService.isRunning(); i++) {
        await readLatestSMS(); // Fetch the latest SMS
        await sleep(delay); // Delay for next iteration
      }
    });
  };

  const sleep = time => new Promise(resolve => setTimeout(resolve, time));

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
      delay: 20000, // Check every 20 seconds
    },
  };

  const startTaskHandler = async () => {
    if (!isTaskRunning) {
      console.log('Starting background task');
      setIsTaskRunning(true);
      startTask(); // Update context
      try {
        await BackgroundService.start(veryIntensiveTask, options);
        await AsyncStorage.setItem('isBackgroundTaskStarted', 'true');
      } catch (error) {
        console.error('Error starting background task:', error);
        setIsTaskRunning(false);
      }
    }
  };

  const stopTaskHandler = async () => {
    if (isTaskRunning) {
      console.log('Stopping background task');
      try {
        await BackgroundService.stop();
        stopTask(); // Update context
        setIsTaskRunning(false);
        setCountdown(20); // Reset countdown when the task stops
        await AsyncStorage.setItem('isBackgroundTaskStarted', 'false');
      } catch (error) {
        console.error('Error stopping background task:', error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <Text style={styles.headerText}>SMS Scanner</Text>
        </View>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.button}
            onPress={isTaskRunning ? stopTaskHandler : startTaskHandler}>
            <Text style={styles.buttonText}>
              {isTaskRunning ? 'Stop Task' : 'Start Task'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.apiStatus}>API Status: {apiStatus}</Text>
          <Text style={styles.predictedResult}>
            Predicted Result: {predictedResult}
          </Text>
          <Text style={styles.latestSms}>Latest SMS: {latestSms}</Text>
          <Text style={styles.smsSender}>Sender: {smsSender}</Text>
          <Text style={styles.countdown}>
            {isTaskRunning ? `Countdown: ${countdown}s` : ''}
          </Text>
        </View>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(false);
          }}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Are you sure you want to exit?</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setModalVisible(false);
                BackHandler.exitApp();
              }}>
              <Text style={styles.buttonText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setModalVisible(false);
              }}>
              <Text style={styles.buttonText}>No</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  apiStatus: {
    fontSize: 16,
    marginBottom: 10,
  },
  predictedResult: {
    fontSize: 16,
    marginBottom: 10,
  },
  latestSms: {
    fontSize: 16,
    marginBottom: 10,
  },
  smsSender: {
    fontSize: 16,
    marginBottom: 10,
  },
  countdown: {
    fontSize: 16,
    marginBottom: 10,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
});

export default Sms;
