import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
} from 'react';
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
  Dimensions,
} from 'react-native';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {supabase} from './supabase';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthContext} from './AuthContext';
import {FlatList} from 'react-native-gesture-handler';

const {width, height} = Dimensions.get('window');

// Client IDs for Google Sign-In
const WEB_CLIENT_ID =
  '483287191355-lr9eqf88sahgfsg63eaoq1p37dp89rh3.apps.googleusercontent.com';
const ANDROID_CLIENT_ID =
  '483287191355-29itib6r943rprhcruog9s3aifengdmc.apps.googleusercontent.com';

// Push Notification Configuration
PushNotification.configure({
  onRegister: token => console.log('TOKEN:', token),
  onNotification: notification => console.log('NOTIFICATION:', notification),
  permissions: {alert: true, badge: true, sound: true},
  popInitialNotification: true,
  requestPermissions: true,
});

const sleep = time => new Promise(resolve => setTimeout(resolve, time));

const Gmail1 = () => {
  const {user} = useContext(AuthContext);
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
      console.log('Gmail1 is in background, background task continues running');
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
        PushNotification.localNotification({
          channelId: 'default',
          title: 'Scam Email Detected!',
          message: `Scam email detected from ${sender}.`,
          playSound: true,
          soundName: 'default',
        });
      } else {
        setScammerStatus(prev => ({...prev, isScammer: false}));
      }
    } catch (error) {
      console.error('Error sending email to API:', error);
      Alert.alert('Error', 'Failed to send email to API');
    }
  };

  const storeScamEmail = async (sender, subject, body) => {
    try {
      const {data, error} = await supabase.from('scam_gmail').insert([
        {
          sid: user.email,
          sender,
          subject,
          body,
        },
      ]);
      if (error) {
        throw error;
      }
      console.log('Scam email stored successfully:', data);
    } catch (error) {
      console.error('Error storing scam email:', error);
      Alert.alert('Error', 'Failed to store scam email');
    }
  };

  const fetchScamEmails = async () => {
    try {
      const {data, error} = await supabase
        .from('scam_gmail')
        .select('*')
        .eq('sid', user.email);
      if (error) {
        throw error;
      }
      setScamEmails(data || []);
      console.log('Scam emails fetched successfully:', data);
    } catch (error) {
      console.error('Error fetching scam emails:', error);
      Alert.alert('Error', 'Failed to fetch scam emails');
    }
  };

  useEffect(() => {
    if (user.email) {
      fetchScamEmails();
    }
  }, [user]);

  const startTask = async () => {
    try {
      const options = {
        taskName: 'Gmail Background Task',
        taskTitle: 'Fetching New Emails',
        taskDesc: 'Checking for new emails and detecting scams',
        taskIcon: {
          name: 'ic_launcher',
          type: 'mipmap',
        },
        color: '#FF6347',
        linkingURL: 'yourapp://chat',
        parameters: {delay: 10000},
      };

      await BackgroundService.start(task, options);
      setIsTaskRunning(true);
      await AsyncStorage.setItem('isBackgroundTaskStarted', 'true');
    } catch (error) {
      console.error('Error starting background task:', error);
      Alert.alert('Error', 'Failed to start background task');
    }
  };

  const stopTask = async () => {
    try {
      await BackgroundService.stop();
      setIsTaskRunning(false);
      await AsyncStorage.removeItem('isBackgroundTaskStarted');
    } catch (error) {
      console.error('Error stopping background task:', error);
      Alert.alert('Error', 'Failed to stop background task');
    }
  };

  const task = async taskDataArguments => {
    while (BackgroundService.isRunning()) {
      await fetchLatestEmail();
      await sleep(60000); // Run every minute
    }
  };

  const handleStartButtonPress = async () => {
    if (isTaskRunning) {
      Alert.alert(
        'Task Already Running',
        'The background task is already running.',
      );
    } else {
      await startTask();
    }
  };

  const handleStopButtonPress = async () => {
    if (isTaskRunning) {
      await stopTask();
    } else {
      Alert.alert(
        'No Task Running',
        'No background task is currently running.',
      );
    }
  };

  const deleteScamEmail = async id => {
    try {
      // Delete the row from the 'scam_gmail' table where the ID matches
      const {error} = await supabase
        .from('scam_gmail') // Ensure the table name is correct
        .delete()
        .eq('id', id); // Ensure 'id' is the correct column name for the primary key

      if (error) {
        throw error; // Throw error if something went wrong
      } else {
        console.log('Scam email successfully deleted from scam_gmail.');

        // Refresh the list after deletion
        fetchScamEmails(); // Ensure this function is defined and correctly refreshes the list
      }
    } catch (error) {
      console.error('Error deleting scam email:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Text style={styles.headerText}>Gmail Scam Detection</Text>

      {userInfo ? (
        <View style={styles.signOutButton}>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.signInButton}>
          <TouchableOpacity onPress={signIn}>
            <Text style={styles.buttonText}>Sign In with Google</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.fetchButtonContainer}>
        <TouchableOpacity
          style={styles.fetchButton}
          onPress={fetchLatestEmail}
          disabled={isLoading}>
          <Text style={styles.buttonText}>
            {isLoading ? 'Fetching...' : 'Fetch Latest Email'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>Next Fetch in: {timer} seconds</Text>
      </View>

      {scammerStatus.isScammer && (
        <View style={styles.scammerStatus}>
          <Text style={styles.scammerText}>
            This email is classified as a scam. (Confidence: {confidence}%)
          </Text>
        </View>
      )}

      {/* FlatList for Scam Emails */}
      <FlatList
        data={scamEmails}
        keyExtractor={item => item.sid.toString()} // Assuming 'sid' is unique
        renderItem={({item}) => (
          <View style={styles.scamItem}>
            <Text style={styles.scamSubject}>{item.scam_subject}</Text>
            <Text style={styles.scamBody}>{item.scam_body}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteScamEmail(item)}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text>No scam emails detected.</Text>}
      />

      <TouchableOpacity
        style={styles.modalButton}
        onPress={() => setModalVisible(true)}>
        <Text style={styles.buttonText}>Show Scam Emails</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <FlatList
            data={scamEmails}
            keyExtractor={item => item.id.toString()} // Ensure the 'sid' is unique for each item
            renderItem={({item}) => (
              <View style={styles.scamItem}>
                <Text style={styles.scamSubject}>{item.scam_subject}</Text>
                <Text style={styles.scamBody}>{item.scam_body}</Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteScamEmail(item.id)} // Pass the unique identifier here
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={<Text>No scam emails detected.</Text>}
          />
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => setModalVisible(false)}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <View style={styles.taskButtons}>
        <TouchableOpacity
          style={styles.taskButton}
          onPress={handleStartButtonPress}>
          <Text style={styles.buttonText}>Start Background Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.taskButton}
          onPress={handleStopButtonPress}>
          <Text style={styles.buttonText}>Stop Background Task</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContainer: {
    padding: 16,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  signInButton: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  signOutButton: {
    backgroundColor: '#DB4437',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  fetchButtonContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  fetchButton: {
    backgroundColor: '#34A853',
    padding: 15,
    borderRadius: 5,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 16,
  },
  scammerStatus: {
    backgroundColor: '#FDD835',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  scammerText: {
    fontSize: 16,
    textAlign: 'center',
  },
  scamList: {
    marginBottom: 20,
  },
  scamItem: {
    backgroundColor: '#F9F9F9',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  scamSubject: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  scamBody: {
    color: '#333',
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButton: {
    backgroundColor: '#FF5722',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalEmail: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  modalSubject: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalBody: {
    color: '#333',
  },
  closeModalButton: {
    backgroundColor: '#1976D2',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  taskButtons: {
    marginTop: 20,
  },
  taskButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
});

export default Gmail1;
