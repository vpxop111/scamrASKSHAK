import React, {useState, useEffect, useCallback, useRef} from 'react';
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
} from 'react-native';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from './supabase';
import BackgroundService from 'react-native-background-actions';
import {useTask} from './TaskContext'; // Import TaskContext

PushNotification.configure({
  onRegister: function (token) {
    console.log('TOKEN:', token);
  },
  onNotification: function (notification) {
    console.log('NOTIFICATION:', notification);
  },
  permissions: {
    alert: true,
    badge: true,
    sound: true,
  },
  popInitialNotification: true,
  requestPermissions: true,
});

const sleep = time => new Promise(resolve => setTimeout(() => resolve(), time));

const Gmail1 = () => {
  const {isTaskRunning, startTask, stopTask} = useTask(); // Use context to manage task
  const [userEmail, setUserEmail] = useState('example@example.com'); // Static email
  const [latestEmail, setLatestEmail] = useState(null);
  const [latestEmailId, setLatestEmailId] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [timer, setTimer] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [scammerStatus, setScammerStatus] = useState({
    isScammer: false,
    checkedSender: null,
    stored: false,
  });
  const [scamEmails, setScamEmails] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const scammerCacheRef = useRef({});
  const notifiedScammersRef = useRef({});

  useEffect(() => {
    checkAndStartBackgroundTask();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      backHandler.remove();
      appStateSubscription.remove();
    };
  }, []);

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
      console.log('Gmail1 is in background, background task continues running');
    }
  };

  const checkAndStartBackgroundTask = async () => {
    try {
      const isTaskStarted = await AsyncStorage.getItem(
        'isBackgroundTaskStarted',
      );
      if (isTaskStarted === 'true') {
        startTask(); // Start task using context
      }
    } catch (error) {
      console.error('Error checking background task status:', error);
    }
  };

  const fetchLatestEmail = useCallback(async () => {
    if (isLoading || !userEmail) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=1',
        {
          headers: {Authorization: `Bearer YOUR_ACCESS_TOKEN`}, // Use your access token
        },
      );
      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        const messageId = data.messages[0].id;
        if (messageId !== latestEmailId) {
          setLatestEmailId(messageId);
          const messageResponse = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
            {
              headers: {Authorization: `Bearer YOUR_ACCESS_TOKEN`}, // Use your access token
            },
          );
          const messageData = await messageResponse.json();
          setLatestEmail(messageData);
          await sendEmailToApi(messageData);
        }
      }
    } catch (error) {
      console.error('Error fetching latest email:', error);
      Alert.alert('Error', 'Failed to fetch the latest email');
    } finally {
      setIsLoading(false);
      setTimer(60);
    }
  }, [latestEmailId, isLoading, userEmail]);

  const base64UrlDecode = str => {
    try {
      return decodeURIComponent(
        atob(str.replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
    } catch (error) {
      console.error('Error decoding Base64 string:', error);
      return 'Error decoding body';
    }
  };

  const sendEmailToApi = async email => {
    const subject =
      email.payload.headers.find(
        header => header.name.toLowerCase() === 'subject',
      )?.value || 'No subject';
    const bodyPart = email.payload.parts
      ? email.payload.parts.find(part => part.mimeType === 'text/plain')?.body
          ?.data
      : email.snippet;

    const body = bodyPart ? base64UrlDecode(bodyPart) : 'No body';
    const sender =
      email.payload.headers.find(header => header.name.toLowerCase() === 'from')
        ?.value || 'Unknown sender';

    const emailData = {subject, body};

    try {
      const response = await fetch(
        'https://varun324242-gmail.hf.space/predict',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(emailData),
        },
      );
      const result = await response.json();
      console.log('API Response:', result);
      setEmailStatus(result.predicted_result);
      setConfidence(result.confidence);

      if (result.predicted_result.toLowerCase() === 'scam') {
        await storeScamEmail(sender, subject, body);
        setScammerStatus(prev => ({...prev, isScammer: true, stored: true}));
        scammerCacheRef.current[sender] = true;

        if (!notifiedScammersRef.current[sender]) {
          PushNotification.localNotification({
            channelId: 'default-channel-id',
            title: 'Scam Email Detected',
            message: `Scam email from ${sender}`,
            bigText: `Subject: ${subject}\n\nBody: ${body}`,
          });
          notifiedScammersRef.current[sender] = true;
        }
      }

      const isScam = await checkIfScammer(sender);
      setScammerStatus(prev => ({
        ...prev,
        isScammer: isScam,
        checkedSender: sender,
      }));
    } catch (error) {
      console.error('Error sending email to API:', error);
      Alert.alert('Error', 'Failed to send email to the API');
    }
  };

  const storeScamEmail = async (sender, subject, body) => {
    try {
      const {data, error} = await supabase
        .from('scam_emails')
        .insert([{sender, subject, body, detected_at: new Date()}]);
      if (error) {
        console.error('Error storing scam email:', error);
      } else {
        console.log('Scam email stored:', data);
        setScamEmails(prev => [...prev, {sender, subject, body}]);
      }
    } catch (error) {
      console.error('Error storing scam email:', error);
      Alert.alert('Error', 'Failed to store scam email');
    }
  };

  const checkIfScammer = async sender => {
    try {
      const {data, error} = await supabase
        .from('scammers')
        .select('sender')
        .eq('sender', sender);
      if (error) {
        console.error('Error checking scammer status:', error);
      }
      return data.length > 0;
    } catch (error) {
      console.error('Error checking scammer status:', error);
      return false;
    }
  };

  const startBackgroundTask = async () => {
    try {
      await BackgroundService.start(backgroundTask, taskConfig);
      await AsyncStorage.setItem('isBackgroundTaskStarted', 'true');
    } catch (error) {
      console.error('Error starting background task:', error);
      Alert.alert('Error', 'Failed to start background task');
    }
  };

  const stopBackgroundTask = async () => {
    try {
      await BackgroundService.stop();
      await AsyncStorage.setItem('isBackgroundTaskStarted', 'false');
    } catch (error) {
      console.error('Error stopping background task:', error);
      Alert.alert('Error', 'Failed to stop background task');
    }
  };

  const backgroundTask = async taskData => {
    const {timeout} = taskData;
    while (BackgroundService.isRunning()) {
      await fetchLatestEmail();
      await sleep(60000); // Sleep for 1 minute
    }
  };

  const taskConfig = {
    taskName: 'GmailTask',
    taskTitle: 'Gmail Scanning',
    taskDesc: 'Scanning Gmail for new emails',
    taskIcon: {name: 'ic_launcher', type: 'mipmap'},
    color: '#ff00ff',
    linkingURI: 'yourapp://chat', // Update with your app's URI scheme
    parameters: {
      timeout: 5000,
    },
  };

  const handleEmailScan = () => {
    if (isTaskRunning) {
      stopTask(); // Use context to stop the task
    } else {
      startBackgroundTask(); // Use context to start the task
    }
  };

  const handleSettingsPress = () => {
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.title}>Gmail Scanning</Text>
        </View>
        <View style={styles.body}>
          <TouchableOpacity style={styles.button} onPress={handleEmailScan}>
            <Text style={styles.buttonText}>
              {isTaskRunning ? 'Stop Scanning' : 'Start Scanning'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleSettingsPress}>
            <Text style={styles.buttonText}>Settings</Text>
          </TouchableOpacity>
          <View style={styles.emailContainer}>
            <Text style={styles.emailHeader}>Latest Email Status:</Text>
            <Text style={styles.emailText}>{emailStatus}</Text>
            <Text style={styles.emailText}>Confidence: {confidence}</Text>
            <Text style={styles.emailText}>Timer: {timer}s</Text>
          </View>
        </View>
      </ScrollView>
      <Modal transparent={true} visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  body: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    margin: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  emailContainer: {
    marginTop: 20,
  },
  emailHeader: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emailText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default Gmail1;
