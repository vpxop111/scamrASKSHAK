import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Modal,
  BackHandler,
  AppState,
  StatusBar,
  PermissionsAndroid,
  Dimensions,
} from 'react-native';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import SmsAndroid from 'react-native-get-sms-android';
import CallDetectorManager from 'react-native-call-detection';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from './supabase';

const {width} = Dimensions.get('window');

const WEB_CLIENT_ID =
  '483287191355-lr9eqf88sahgfsg63eaoq1p37dp89rh3.apps.googleusercontent.com';
const ANDROID_CLIENT_ID =
  '483287191355-29itib6r943rprhcruog9s3aifengdmc.apps.googleusercontent.com';

PushNotification.createChannel(
  {
    channelId: 'default-channel-id',
    channelName: 'Default Channel',
    channelDescription: 'A default channel',
    soundName: 'default',
    importance: 4,
    vibrate: true,
  },
  created => console.log(`createChannel returned '${created}'`),
);

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

const App = () => {
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
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const scammerCacheRef = useRef({});
  const notifiedScammersRef = useRef({});
  const [latestSms, setLatestSms] = useState('');
  const [smsSender, setSmsSender] = useState('');
  const [predictedResult, setPredictedResult] = useState('');
  const [smsTimer, setSmsTimer] = useState(20);
  const [apiStatus, setApiStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastProcessedSmsId, setLastProcessedSmsId] = useState(null);
  const [scamMessages, setScamMessages] = useState([]);
  const [incomingCallNumber, setIncomingCallNumber] = useState('');
  const [isIncomingCallScammer, setIsIncomingCallScammer] = useState(false);
  const timerRef = useRef(null);
  const notifiedSmsRef = useRef(new Set());

  useEffect(() => {
    configureGoogleSignin();
    requestReadSmsPermission();
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
      console.log('App is in background, background task continues running');
    }
  };

  const configureGoogleSignin = async () => {
    try {
      await GoogleSignin.configure({
        offlineAccess: true,
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
      setUserInfo(userInfo);
    } catch (error) {
      console.error('Sign-In Error:', error);
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
      setEmailStatus('Error classifying email');
      setConfidence(null);
    }
  };

  const storeScamEmail = async (sender, subject, body) => {
    try {
      const {data, error} = await supabase
        .from('Gmailss')
        .insert([{scam_email: sender, scam_subject: subject, scam_body: body}]);

      if (error) {
        if (error.code === '23505') {
          console.log('Scammer email already exists in the database.');
        } else {
          throw error;
        }
      } else {
        console.log('Scam email successfully stored.');
      }
    } catch (error) {
      console.error('Error storing scam email in Supabase: ', error);
    }
  };

  const checkIfScammer = async sender => {
    console.log('Checking if sender is a scammer:', sender);

    if (sender in scammerCacheRef.current) {
      return scammerCacheRef.current[sender];
    }

    try {
      const {data, error} = await supabase
        .from('Gmailss')
        .select('scam_email')
        .eq('scam_email', sender)
        .single();

      if (error) {
        console.error('Error checking scammer status:', error);
        return false;
      }

      const isScammer = !!data;
      scammerCacheRef.current[sender] = isScammer;

      console.log(
        isScammer
          ? `Scammer detected: ${sender}`
          : `Sender is not a scammer: ${sender}`,
      );

      return isScammer;
    } catch (error) {
      console.error('Error in checkIfScammer:', error);
      return false;
    }
  };

  const fetchScamEmails = async sender => {
    try {
      const {data, error} = await supabase
        .from('Gmailss')
        .select('scam_email, scam_subject, scam_body')
        .eq('scam_email', sender);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setScamEmails(data);
        setModalVisible(true);
      } else {
        console.log('No scam emails found for this sender');
        Alert.alert('No Scam Emails', 'No scam emails found for this sender.');
      }
    } catch (error) {
      console.error('Error fetching scam emails:', error);
      Alert.alert('Error', 'Failed to fetch scam emails. Please try again.');
    }
  };

  const renderEmailSubject = () => {
    if (!latestEmail) return null;
    const subject = latestEmail.payload.headers.find(
      header => header.name.toLowerCase() === 'subject',
    );
    return subject ? subject.value : 'No subject';
  };

  const renderEmailSender = () => {
    if (!latestEmail) return null;
    const sender = latestEmail.payload.headers.find(
      header => header.name.toLowerCase() === 'from',
    );
    return sender ? sender.value : 'Unknown sender';
  };

  const veryIntensiveTask = async taskDataArguments => {
    const {delay} = taskDataArguments;
    await new Promise(async resolve => {
      for (let i = 0; BackgroundService.isRunning(); i++) {
        await fetchLatestEmail();
        await readLatestSMS();
        await sleep(delay);
      }
    });
  };

  const options = {
    taskName: 'Scanner',
    taskTitle: 'Scanner',
    taskDesc: 'Scanning emails and SMS...',
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
      console.log('Starting background task');
      setIsTaskRunning(true);
      try {
        await BackgroundService.start(veryIntensiveTask, options);
        await AsyncStorage.setItem('isBackgroundTaskStarted', 'true');
      } catch (error) {
        console.error('Error starting background task:', error);
        setIsTaskRunning(false);
      }
    }
  };

  const stopTask = async () => {
    if (isTaskRunning) {
      console.log('Stopping background task');
      try {
        await BackgroundService.stop();
        setIsTaskRunning(false);
        await AsyncStorage.setItem('isBackgroundTaskStarted', 'false');
      } catch (error) {
        console.error('Error stopping background task:', error);
      }
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
        readLatestSMS();
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

          // Check if the message has already been processed
          if (messageId !== lastProcessedSmsId) {
            setLastProcessedSmsId(messageId);
            setLatestSms(latestMessage);
            setSmsSender(sender);
            sendSmsToApi(sender, latestMessage);
          }
        }
      },
    );
  };

  const sendMessageToApi = async message => {
    if (!message) {
      setIsChecking(false);
      return;
    }

    setProcessing(true);
    setApiStatus('Sending message to API...');
    try {
      const response = await fetch(
        'https://varun324242-sssssss.hf.space/predict',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({message}),
        },
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      const result = data.predicted_result || 'No result found';
      setPredictedResult(result);
      setApiStatus('API response received');

      if (result.toLowerCase() === 'scam') {
        const cleanSender = smsSender.replace(/ $Scammer$$/, '');
        await storeScamMessage(cleanSender, message);
        setScammerStatus(prev => ({...prev, isScammer: true, stored: true}));
        scammerCacheRef.current[cleanSender] = true;

        // Check if we've already notified about this SMS
        if (!notifiedSmsRef.current.has(lastProcessedSmsId)) {
          // Show notification for scam message
          PushNotification.localNotification({
            channelId: 'default-channel-id',
            title: 'Scam SMS Detected',
            message: `From: ${cleanSender}\nMessage: ${message}`,
          });

          // Add this SMS to the notified set
          notifiedSmsRef.current.add(lastProcessedSmsId);
          await saveNotifiedSms();
        }
      }
    } catch (error) {
      console.error('Error sending message to API: ', error);
      setPredictedResult('Error sending message to API');
      setApiStatus('Error sending message to API');
    } finally {
      setProcessing(false);
      setIsChecking(false);
    }
  };
  useEffect(() => {
    if (!processing && latestSms && !isChecking) {
      sendMessageToApi(latestSms);
    }
  }, [processing, latestSms, isChecking]);

  const storeScamMessage = async (phoneNumber, message) => {
    try {
      if (typeof phoneNumber !== 'string') {
        console.error('Invalid phone number type');
        return;
      }

      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

      const {data, error} = await supabase
        .from('scammers')
        .insert([{scam_no: cleanPhoneNumber, scam_mes: message}]);

      if (error) {
        if (error.code === '23505') {
          console.log('Scammer already exists in the database.');
        } else {
          throw error;
        }
      } else {
        console.log('Scam message successfully stored.');
      }
    } catch (error) {
      console.error('Error storing scam message in Supabase)', error);
      const messageId = messages[0]._id;

      // Check if this message has already been processed
      if (messageId !== lastProcessedSmsId) {
        setLastProcessedSmsId(messageId);
        setLatestSms(latestMessage);
        setSmsSender(sender);

        if (!notifiedSmsRef.current.has(messageId)) {
          sendSmsToApi(latestMessage, sender);
        }
      }
    }
  };

  const sendSmsToApi = async (message, sender) => {
    setProcessing(true);
    try {
      const response = await fetch('https://varun324242-sms.hf.space/predict', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message, sender}),
      });
      const result = await response.json();
      console.log('API Response:', result);
      setPredictedResult(result.predicted_result);
      setApiStatus('Success');

      if (result.predicted_result.toLowerCase() === 'scam') {
        await storeScamSms(sender, message);
        notifiedSmsRef.current.add(lastProcessedSmsId);
        PushNotification.localNotification({
          channelId: 'default-channel-id',
          title: 'Scam SMS Detected',
          message: `Scam SMS from ${sender}`,
          bigText: `Message: ${message}`,
        });
      }
    } catch (error) {
      console.error('Error sending SMS to API:', error);
      setApiStatus('Error');
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
        if (error.code === '23505') {
          console.log('Scammer SMS already exists in the database.');
        } else {
          throw error;
        }
      } else {
        console.log('Scam SMS successfully stored.');
      }
    } catch (error) {
      console.error('Error storing scam SMS in Supabase:', error);
    }
  };

  const checkAndStartBackgroundTask = async () => {
    const isBackgroundTaskStarted = await AsyncStorage.getItem(
      'isBackgroundTaskStarted',
    );

    if (isBackgroundTaskStarted === 'true') {
      startTask();
    }
  };

  const renderScamEmails = () => {
    return scamEmails.map((email, index) => (
      <View key={index} style={styles.scamEmailContainer}>
        <Text style={styles.scamEmailSender}>{email.scam_email}</Text>
        <Text style={styles.scamEmailSubject}>{email.scam_subject}</Text>
        <Text style={styles.scamEmailBody}>{email.scam_body}</Text>
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Scam Detection App</Text>

        {!userInfo ? (
          <TouchableOpacity
            style={styles.signInButton}
            onPress={signIn}
            disabled={isSigninInProgress}>
            <Icon name="google" size={24} color="#fff" />
            <Text style={styles.signInButtonText}>Sign In with Google</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.userInfoContainer}>
            <Text style={styles.userInfoText}>
              Welcome, {userInfo.user.name}
            </Text>
            <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {userInfo && (
          <View style={styles.emailContainer}>
            <TouchableOpacity
              style={styles.fetchEmailButton}
              onPress={fetchLatestEmail}
              disabled={isLoading}>
              <Text style={styles.fetchEmailButtonText}>
                {isLoading ? 'Fetching Email...' : 'Fetch Latest Email'}
              </Text>
              {isLoading && <ActivityIndicator size="small" color="#000" />}
            </TouchableOpacity>

            <View style={styles.emailDetailsContainer}>
              <Text style={styles.emailSubject}>{renderEmailSubject()}</Text>
              <Text style={styles.emailSender}>{renderEmailSender()}</Text>
              <Text style={styles.emailStatus}>
                Status: {emailStatus || 'Unknown'}
              </Text>
              {confidence && (
                <Text style={styles.emailConfidence}>
                  Confidence: {confidence}%
                </Text>
              )}
            </View>

            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>Next fetch in: {timer}s</Text>
            </View>
          </View>
        )}

        <View style={styles.scamContainer}>
          <Text style={styles.scamStatus}>
            {scammerStatus.isScammer
              ? 'Scammer detected!'
              : 'No scammer detected'}
          </Text>
          <TouchableOpacity
            style={styles.scamButton}
            onPress={() => fetchScamEmails(scammerStatus.checkedSender)}>
            <Text style={styles.scamButtonText}>
              {scammerStatus.isScammer
                ? 'View Scam Emails'
                : 'Check Scammer Status'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.smsContainer}>
          <Text style={styles.smsText}>Latest SMS: {latestSms}</Text>
          <Text style={styles.smsSender}>From: {smsSender}</Text>
          <Text style={styles.predictedResult}>
            Prediction: {predictedResult || 'Unknown'}
          </Text>
          <Text style={styles.apiStatus}>API Status: {apiStatus}</Text>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.modalScrollContainer}>
              {renderScamEmails()}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <TouchableOpacity
          style={styles.startButton}
          onPress={startTask}
          disabled={isTaskRunning}>
          <Text style={styles.startButtonText}>
            {isTaskRunning ? 'Task Running' : 'Start Background Task'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.stopButton}
          onPress={stopTask}
          disabled={!isTaskRunning}>
          <Text style={styles.stopButtonText}>Stop Background Task</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  scrollContainer: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    padding: 12,
    borderRadius: 8,
  },
  signInButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  userInfoContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  userInfoText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  signOutButton: {
    backgroundColor: '#d9534f',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  signOutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emailContainer: {
    marginBottom: 20,
  },
  fetchEmailButton: {
    backgroundColor: '#5cb85c',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fetchEmailButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emailDetailsContainer: {
    marginTop: 10,
  },
  emailSubject: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emailSender: {
    fontSize: 14,
  },
  emailStatus: {
    marginTop: 5,
    fontWeight: 'bold',
  },
  emailConfidence: {
    marginTop: 5,
    fontStyle: 'italic',
  },
  timerContainer: {
    marginTop: 10,
  },
  timerText: {
    fontStyle: 'italic',
  },
  scamContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  scamStatus: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scamButton: {
    backgroundColor: '#0275d8',
    padding: 10,
    borderRadius: 8,
  },
  scamButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  smsContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  smsText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  smsSender: {
    fontSize: 14,
    marginBottom: 5,
  },
  predictedResult: {
    marginTop: 5,
    fontWeight: 'bold',
  },
  apiStatus: {
    marginTop: 5,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalScrollContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    width: '80%',
  },
  closeModalButton: {
    marginTop: 10,
    backgroundColor: '#d9534f',
    padding: 10,
    borderRadius: 8,
  },
  closeModalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#5cb85c',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  stopButton: {
    backgroundColor: '#d9534f',
    padding: 10,
    borderRadius: 8,
  },
  stopButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default App;
