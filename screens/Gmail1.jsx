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
import {supabase} from '../supabase';  
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthContext} from '../AuthContext';
import {FlatList} from 'react-native-gesture-handler';
import { useBackgroundTask } from '../BackgroundTaskContext';
const {width, height} = Dimensions.get('window');

// Client IDs for Google Sign-In
const WEB_CLIENT_ID =
  '483287191355-lr9eqf88sahgfsg63eaoq1p37dp89rh3.apps.googleusercontent.com';
const ANDROID_CLIENT_ID =
  '483287191355-29itib6r943rprhcruog9s3aifengdmc.apps.googleusercontent.com';

// Push Notification Configuration
PushNotification.configure({
  // Called when Token is generated (iOS and Android)
  onRegister: token => {
    console.log('TOKEN:', token);
    // You can send this token to your server for notification targeting
  },

  // Called when a remote or local notification is opened or received
  onNotification: notification => {
    console.log('NOTIFICATION:', notification);
    // Process the notification here (e.g., navigate to a screen)
    notification.finish(PushNotificationIOS.FetchResult.NoData);
  },

  // Android only: Can be used to configure the notification settings
  permissions: {
    alert: true,
    badge: true,
    sound: true,
  },

  // Set to true to automatically handle notifications when the app is not in the foreground
  popInitialNotification: true,

  // Request permissions on iOS
  requestPermissions: Platform.OS === 'ios',
});

// Create a notification channel (Android only)
PushNotification.createChannel(
  {
    channelId: 'default', // (required) Channel ID
    channelName: 'Default channel', // (required) Channel Name
    channelDescription: 'A default channel', // (optional) Channel Description
    soundName: 'default', // (optional) Default sound
    importance: 4, // (optional) Importance level (4 is high priority)
    vibrate: true, // (optional) Enable vibration
  },
  created => console.log(`createChannel returned '${created}'`),
);

const sleep = time => new Promise(resolve => setTimeout(resolve, time));

const Gmail1 = () => {
  const { isTaskRunning, startTask, stopTask: stopBackgroundTask, UNLIMITED_DURATION } = useBackgroundTask();
  const { user, setUserInfo } = useContext(AuthContext);
  const [isSigninInProgress, setIsSigninInProgress] = useState(false);
  const [latestEmail, setLatestEmail] = useState(null);
  const [latestEmailId, setLatestEmailId] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scammerStatus, setScammerStatus] = useState({
    isScammer: false,
    checkedSender: null,
    stored: false,
  });
  const [scamEmails, setScamEmails] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const scammerCacheRef = useRef({});
  const notifiedScammersRef = useRef({});

  // Ensure this is declared only once
  const [timer, setTimer] = useState(60); // Timer state

  useEffect(() => {
    configureGoogleSignin();
    checkLoginStatus();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );
    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    // Set up interval for fetching emails every minute
    let fetchInterval;
    if (isLoggedIn) {
      fetchInterval = setInterval(() => {
        fetchLatestEmail();
      }, 60000); // 60000 ms = 1 minute
    }

    return () => {
      backHandler.remove();
      appStateSubscription.remove();
      clearInterval(fetchInterval); // Clear interval on unmount
    };
  }, [isLoggedIn]); // Dependency on isLoggedIn

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
              await stopBackgroundTask();
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

  const checkLoginStatus = async () => {
    if (user) {
      setIsLoggedIn(true);
      console.log('User is logged in:', user.email); // Log user email
    } else {
      setIsLoggedIn(false);
      console.log('User is not logged in'); // Log user not logged in
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
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      setUserInfo(userInfo); // Store userInfo in AuthContext
      await AsyncStorage.setItem('gmailUserInfo', JSON.stringify(userInfo)); // Store user info
      console.log('User signed in:', userInfo); // Log user info
      console.log("sss",userInfo)
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
    if (isLoading || !user) return; // Check if user is available
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
    }
  }, [latestEmailId, isLoading, user]);

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
    const subjectHeader = email.payload.headers.find(
      header => header.name.toLowerCase() === 'subject',
    );
    const subject = subjectHeader ? subjectHeader.value : 'No subject';

    const bodyPart = email.payload.parts
      ? email.payload.parts.find(part => part.mimeType === 'text/plain')?.body
          ?.data
      : email.snippet;
    const body = bodyPart ? base64UrlDecode(bodyPart) : 'No body';

    const senderHeader = email.payload.headers.find(header => header.name.toLowerCase() === 'from');
    const sender = senderHeader ? senderHeader.value : 'Unknown sender';

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
          importance: 'high', // for Android
          vibrate: true, // for Android
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
      const {data, error} = await supabase.from('scam_email').insert([
        {
          sid: user.email,
          sender: sender,
          scam_head: subject,
          scam_body: body,
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
    console.log('Fetching scam emails...');
    try {
      if (!user || !user.email) {
        console.error('User email not found');
        return;
      }

      const { data, error } = await supabase
        .from('scam_email')
        .select('*')
        .eq('sid', user.email);

      if (error) {
        console.error('Error fetching scam emails:', error);
      } else {
        console.log('Fetched scam emails:', data);
        setScamEmails(data);
      }
    } catch (error) {
      console.error('Error fetching scam emails:', error);
    }
  };

  
  useEffect(() => {
    fetchScamEmails();

    // Subscribe to real-time updatesr
    const channel = supabase.channel(`public:scam_email`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'scam_email',
      }, payload => {
        console.log('Change received!', payload);
        fetchScamEmails(); // Refresh the list after any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel); // Clean up the subscription
    };
  }, [user]);

  const deleteScamEmail = async id => {
    console.log('Deleting scam email with ID:', id);
    try {
      const { error } = await supabase.from('scam_email').delete().eq('id', id);

      if (error) {
        console.error('Error deleting scam email:', error);
      } else {
        console.log('Scam email successfully deleted.');
        fetchScamEmails(); // Refresh the list after deletion
      }
    } catch (error) {
      console.error('Error deleting scam email:', error);
    }
  };

  const handleGmailTask = async () => {
    if (isLoggedIn) {
      console.log('[Gmail] Fetching Gmail data...');
      await fetchLatestEmail();
      console.log('[Gmail] Gmail fetch completed');
    } else {
      console.log('[Gmail] User not logged in, skipping Gmail fetch');
    }
  };

  const toggleTask = () => {
    if (isTaskRunning) {
      stopBackgroundTask();
    } else {
      startTask(() => {}, handleGmailTask, UNLIMITED_DURATION); // Use UNLIMITED_DURATION here
      // Remove the timeout setup since we're using unlimited duration
    }
  };

  // Timer countdown in seconds
  useEffect(() => {
    // Fetch immediately on mount
    fetchLatestEmail();

    // Set up the timer interval
    const intervalId = setInterval(() => {
      setTimer(prevTimer => {
        if (prevTimer <= 1) {
          // Fetch email when timer hits zero
          fetchLatestEmail();
          return 60; // Reset timer
        }
        return prevTimer - 1;
      });
    }, 1000); // Update timer every second

    // Clear interval on unmount
    return () => clearInterval(intervalId);
  }, [fetchLatestEmail]);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Text className="text-2xl font-bold text-white text-center mb-4 mt-5">
        Gmail Scam Detection
      </Text>

      {user ? (
        <View className="mb-4 ">
          <TouchableOpacity
            onPress={signOut}
            className="bg-red-600 p-3 rounded-lg mx-5">
            <Text className="text-white text-center text-lg ">Sign Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="mb-4">
          <TouchableOpacity
            onPress={signIn}
            className="bg-blue-500 p-3 rounded-lg mx-5">
            <Text className="text-white text-center text-lg">
              Sign In with Google
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="mb-4">
        <TouchableOpacity
          style={{backgroundColor: isLoading ? '#ddff00' : '#ddff00'}}
          className="p-3 rounded-lg mx-5  "
          onPress={fetchLatestEmail}
          disabled={isLoading}>
          <Text className="text-black text-center text-lg">
            {isLoading ? 'Fetching...' : 'Fetch Latest Email'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mb-4">
        <Text className="text-lg text-gray-400 text-center">
          Next Fetch in: {timer} seconds
        </Text>
      </View>

      {scammerStatus.isScammer && (
        <View className="bg-red-900 p-4 mb-4 rounded-lg">
          <Text className="text-red-400 text-center text-lg">
            This email is classified as a scam. (Confidence: {confidence}%)
          </Text>
        </View>
      )}

      <FlatList
        data={scamEmails}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View className="bg-gray-800 p-4 mb-2 rounded-lg">
            <Text className="text-white font-semibold">
              Sender: {item.sender}
            </Text>
            <Text className="text-gray-300">Subject: {item.scam_head}</Text>
            <Text className="text-gray-300">Body: {item.scam_body}</Text>
            <TouchableOpacity
              onPress={() => deleteScamEmail(item.id)}
              className="mt-2 bg-red-600 p-2 rounded-lg">
              <Text className="text-white text-center">Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ padding: 20 }}
      />

      <View className="flex-row justify-around mt-4">
        <TouchableOpacity
          className="bg-[#ddff00] p-3 rounded-lg flex-1 mr-2"
          onPress={toggleTask}>
          <Text className="text-white text-center text-lg text-black">
            {isTaskRunning ? 'Stop Scanning' : 'Start Scanning'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Gmail1;