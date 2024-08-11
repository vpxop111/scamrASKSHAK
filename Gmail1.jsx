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
} from 'react-native';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {supabase} from './supabase';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      console.log('App is in background, background task continues running');
    }
  };

  const checkAndStartBackgroundTask = async () => {
    try {
      const isTaskStarted = await AsyncStorage.getItem(
        'isBackgroundTaskStarted',
      );
      if (isTaskStarted === 'true') {
        setIsTaskRunning(true);
      }
    } catch (error) {
      console.error('Error checking background task status:', error);
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
        await sleep(delay);
      }
    });
  };

  const options = {
    taskName: 'Gmail Scanner',
    taskTitle: 'Gmail Scanner',
    taskDesc: 'Scanning emails...',
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.container}>
          {!userInfo ? (
            <TouchableOpacity
              style={styles.signInButton}
              onPress={signIn}
              disabled={isSigninInProgress}>
              <Text style={styles.buttonText}>Sign in with Google</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.loggedInContainer}>
              <Text style={styles.loggedInText}>
                Logged in as: {userInfo.user.email}
              </Text>
              <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
                <Text style={styles.buttonText}>Sign out</Text>
              </TouchableOpacity>
              {latestEmail ? (
                <View style={styles.emailContainer}>
                  <Text style={styles.emailTitle}>Latest Email:</Text>
                  <Text style={styles.subject}>
                    Subject: {renderEmailSubject()}
                  </Text>
                  <Text style={styles.sender}>
                    From: {renderEmailSender()}
                    {scammerStatus.isScammer &&
                      scammerStatus.checkedSender === renderEmailSender() &&
                      ' (Scammer)'}
                  </Text>
                  {emailStatus && (
                    <View style={styles.statusContainer}>
                      <Text style={styles.emailTitle}>Classification:</Text>
                      <Text
                        style={[
                          styles.status,
                          emailStatus.toLowerCase() === 'scam'
                            ? styles.scam
                            : styles.ham,
                        ]}>
                        {emailStatus}
                      </Text>
                      {confidence !== null && (
                        <Text style={styles.confidence}>
                          Confidence: {(confidence * 100).toFixed(2)}%
                        </Text>
                      )}
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.checkScamButton}
                    onPress={() => fetchScamEmails(renderEmailSender())}
                    activeOpacity={0.7}>
                    <Text style={styles.buttonText}>Check Scam History</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.fetchingText}>
                  Fetching latest email...
                </Text>
              )}
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>Next update in: {timer}s</Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={fetchLatestEmail}
                  disabled={isLoading}
                  activeOpacity={0.7}>
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Refresh</Text>
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.startButton, isTaskRunning && styles.stopButton]}
                onPress={isTaskRunning ? stopTask : startTask}>
                <Text style={styles.buttonText}>
                  {isTaskRunning
                    ? 'Stop Background Task'
                    : 'Start Background Task'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Scam Email History</Text>
            <ScrollView>
              {scamEmails.map((email, index) => (
                <View key={index} style={styles.scamEmailItem}>
                  <Text style={styles.scamEmailSubject}>
                    {email.scam_subject}
                  </Text>
                  <Text style={styles.scamEmailSender}>{email.scam_email}</Text>
                  <Text style={styles.scamEmailBody}>{email.scam_body}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.7}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  scrollView: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loggedInContainer: {
    width: '100%',
    alignItems: 'center',
  },
  loggedInText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  signInButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 5,
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: '#DB4437',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emailContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subject: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  sender: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  statusContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    padding: 10,
  },
  status: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  scam: {
    color: '#D32F2F',
  },
  ham: {
    color: '#388E3C',
  },
  confidence: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  fetchingText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timerText: {
    fontSize: 16,
    color: '#333',
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    padding: 10,
  },
  checkScamButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '80%',
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  scamEmailItem: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 10,
  },
  scamEmailSubject: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scamEmailSender: {
    fontSize: 14,
    color: '#666',
  },
  scamEmailBody: {
    fontSize: 14,
    marginTop: 5,
  },
  closeButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 15,
  },
});

export default Gmail1;
