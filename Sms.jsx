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
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';
import {supabase} from './supabase'; // Import your Supabase client instance
import {useTask} from './TaskContext'; // Import useTask from TaskContext
import {AuthContext} from './AuthContext';
import Smsnotifi from './Smsnotifi';

const Sms = () => {
  const {user, signOut} = useContext(AuthContext); // Use AuthContext to get user and signOut
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
    if (user) {
      console.log('User email:', user.email);
      console.log('User UID:', user.uid);
    } else {
      navigation.navigate('Login'); // Redirect to Login if no user
    }
  }, [user]);

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

  const storeScamMessageInScamsms = async (phoneNumber, message) => {
    try {
      if (typeof phoneNumber !== 'string') {
        console.error('Invalid phone number type');
        return;
      }
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

      const {data, error} = await supabase.from('scamsms').insert([
        {scam_no: cleanPhoneNumber, scam_mes: message, sid: user.email}, // Use user.email directly
      ]);

      if (error) {
        if (error.code === '23505') {
          console.log('Scam message already exists in the database.');
        } else {
          throw error;
        }
      } else {
        console.log('Scam message successfully stored in scamsms.');
      }
    } catch (error) {
      console.error('Error storing scam message in scamsms: ', error);
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
        .from('scamsms') // Change this to the correct table name if needed
        .insert([
          {scam_no: cleanPhoneNumber, scam_mes: message, sid: user.email}, // Use user.email directly
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
        await storeScamMessage(sender, message); // Store in scammers table
        await storeScamMessageInScamsms(sender, message); // Store in scamsms table

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
      await startTask(options, veryIntensiveTask);
    } else {
      console.log('Background task is already running');
    }
  };

  const stopTaskHandler = async () => {
    if (isTaskRunning) {
      console.log('Stopping background task');
      setIsTaskRunning(false);
      await stopTask();
    } else {
      console.log('No background task running');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Handle any additional logout logic if needed
    } catch (error) {
      console.error('Error during logout: ', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.inner}>
          <Text style={styles.header}>SMS Scanner</Text>
          <Text style={styles.smsContent}>{latestSms}</Text>
          <Text style={styles.sender}>From: {smsSender}</Text>
          <Text style={styles.prediction}>Prediction: {predictedResult}</Text>
          <Text style={styles.apiStatus}>API Status: {apiStatus}</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={startTaskHandler}
            disabled={isTaskRunning || processing}>
            <Text style={styles.buttonText}>Start Task</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={stopTaskHandler}
            disabled={!isTaskRunning || processing}>
            <Text style={styles.buttonText}>Stop Task</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal
        transparent={true}
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Background Task Status</Text>
            <Text style={styles.modalText}>
              {isTaskRunning ? 'Running' : 'Stopped'}
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Smsnotifi />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  smsContent: {
    fontSize: 16,
    marginBottom: 8,
  },
  sender: {
    fontSize: 16,
    marginBottom: 8,
  },
  prediction: {
    fontSize: 16,
    marginBottom: 8,
  },
  apiStatus: {
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 4,
    marginVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  modalText: {
    fontSize: 18,
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default Sms;
