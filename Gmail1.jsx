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
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {supabase} from './supabase';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTask} from './TaskContext'; // Import TaskContext

const WEB_CLIENT_ID =
  '483287191355-lr9eqf88sahgfsg63eaoq1p37dp89rh3.apps.googleusercontent.com';
const ANDROID_CLIENT_ID =
  '483287191355-29itib6r943rprhcruog9s3aifengdmc.apps.googleusercontent.com';

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
  const [userInfo, setUserInfo] = useState(null);
  const [isSigninInProgress, setIsSigninInProgress] = useState(false);
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
    configureGoogleSignin();
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

  const configureGoogleSignin = async () => {
    try {
      await GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        androidClientId: ANDROID_CLIENT_ID,
        scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      });
      console.log('GoogleSignin configured successfully');
    } catch (error) {
      console.error('Error configuring Google Sign-In:', error);
    }
  };

  const signIn = async () => {
    if (isSigninInProgress) return;

    setIsSigninInProgress(true);
    try {
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      const userInfo = await GoogleSignin.signIn();
      // Check if userInfo contains the expected data
      if (userInfo) {
        setUserInfo(userInfo);
      } else {
        Alert.alert('Sign-In Error', 'Unable to get user information.');
      }
    } catch (error) {
      console.error('Sign-In Error:', error.message);
      Alert.alert(
        'Sign-In Error',
        'An error occurred during sign-in. Please try again.',
      );
    } finally {
      setIsSigninInProgress(false);
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
      setUserInfo(null);
      setLatestEmail(null);
      setLatestEmailId(null);
      setEmailStatus(null);
      setConfidence(null);
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'An error occurred while signing out');
    }
  };

  const fetchLatestEmail = useCallback(async () => {
    if (isLoading || !userInfo) return;
    setIsLoading(true);
    try {
      const {accessToken} = await GoogleSignin.getTokens();
      const response = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=1',
        {
          headers: {Authorization: `Bearer ${accessToken}`},
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
              headers: {Authorization: `Bearer ${accessToken}`},
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
  }, [latestEmailId, isLoading, userInfo]);

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
    await sleep(1000);
    while (BackgroundService.isRunning()) {
      fetchLatestEmail();
      await sleep(60000); // Check email every minute
    }
  };

  const taskConfig = {
    taskName: 'GmailChecker',
    taskTitle: 'Gmail Checker',
    taskDesc: 'Checking Gmail for new emails',
    taskIcon: {name: 'ic_launcher', type: 'mipmap'},
    color: '#ff00ff',
    parameters: {delay: 10000},
  };

  const handleStartStopTask = () => {
    if (isTaskRunning) {
      stopTask(); // Stop task using context
    } else {
      startTask(); // Start task using context
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.mainContent}>
          <Text style={styles.title}>Gmail Background Task</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={isTaskRunning ? stopBackgroundTask : startBackgroundTask}>
            <Text style={styles.buttonText}>
              {isTaskRunning ? 'Stop Background Task' : 'Start Background Task'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={signIn}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={signOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
          <Text style={styles.info}>
            {latestEmail ? `Latest Email ID: ${latestEmailId}` : 'No new email'}
          </Text>
          <Text style={styles.info}>
            {emailStatus ? `Status: ${emailStatus}` : 'No status'}
          </Text>
          <Text style={styles.info}>
            {confidence ? `Confidence: ${confidence}` : 'No confidence'}
          </Text>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>Timer: {timer}s</Text>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setModalVisible(true)}>
            <Text style={styles.buttonText}>Show Scam Emails</Text>
          </TouchableOpacity>
          {scammerStatus.isScammer && (
            <Text style={styles.warning}>
              Warning: Scam email detected from {scammerStatus.checkedSender}
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Scam Emails</Text>
            {scamEmails.length > 0 ? (
              scamEmails.map((email, index) => (
                <View key={index} style={styles.emailContainer}>
                  <Text style={styles.emailText}>Sender: {email.sender}</Text>
                  <Text style={styles.emailText}>Subject: {email.subject}</Text>
                  <Text style={styles.emailText}>Body: {email.body}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noEmails}>No scam emails found</Text>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
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
    backgroundColor: '#ffffff',
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    margin: 20,
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    marginVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  info: {
    fontSize: 16,
    marginVertical: 5,
  },
  timerContainer: {
    marginVertical: 10,
  },
  timerText: {
    fontSize: 18,
  },
  warning: {
    color: '#ff0000',
    fontSize: 16,
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emailContainer: {
    marginVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 10,
    width: '100%',
  },
  emailText: {
    fontSize: 16,
  },
  noEmails: {
    fontSize: 16,
    color: '#888888',
  },
  closeButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
});

export default Gmail1;
