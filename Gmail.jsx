import React, {useState, useEffect} from 'react';
import BackgroundFetch from 'react-native-background-fetch';
import {
  StyleSheet,
  View,
  Text,
  Button,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import SmsRetriever from 'react-native-sms-retriever';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {Gmail} from 'react-native-gmail-api-wrapper';
import PushNotification from 'react-native-push-notification';

const App = () => {
  const [isGmailAuthorized, setIsGmailAuthorized] = useState(false);
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);

  useEffect(() => {
    requestSmsPermission();
    configureGoogleSignin();
    configureBackgroundFetch();
  }, []);
  const fetchLatestEmail = useCallback(async () => {
    if (isLoading) return;
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
          const messageResponse = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
            {
              headers: {Authorization: `Bearer ${accessToken}`},
            },
          );
          const messageData = await messageResponse.json();
          sendEmailToApi(messageData);

          // Update the state only if the app is in the foreground
          if (AppState.currentState === 'active') {
            setLatestEmailId(messageId);
            setLatestEmail(messageData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching latest email:', error);
      if (AppState.currentState === 'active') {
        Alert.alert('Error', 'Failed to fetch the latest email');
      }
    } finally {
      setIsLoading(false);
      setTimer(60);
    }
  }, [latestEmailId, isLoading]);
  const configureBackgroundFetch = async () => {
    try {
      const status = await BackgroundFetch.configure(
        {
          minimumFetchInterval: 15, // Fetch interval in minutes
          stopOnTerminate: false, // Continue after user kills the app
          startOnBoot: true, // Restart after device reboot
          enableHeadless: true, // Allow the app to run in headless mode (without UI)
        },
        async taskId => {
          console.log('[BackgroundFetch] taskId:', taskId);
          await fetchLatestEmail(); // Fetch the latest email
          BackgroundFetch.finish(taskId);
        },
        error => {
          console.error('[BackgroundFetch] Failed to start:', error);
        },
      );
      console.log('[BackgroundFetch] configured with status:', status);
    } catch (error) {
      console.error('BackgroundFetch configuration failed:', error);
    }
  };

  BackgroundFetch.registerHeadlessTask(async event => {
    console.log('[BackgroundFetch] Headless event:', event.taskId);
    await fetchLatestEmail();
    BackgroundFetch.finish(event.taskId);
  });

  const requestSmsPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
          {
            title: 'SMS Permission',
            message: 'This app needs access to your SMS messages.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          startSmsRetriever();
        } else {
          console.log('SMS permission denied');
        }
      } else {
        // For iOS, you'll need to handle permission request separately
      }
    } catch (error) {
      console.error('Error requesting SMS permission:', error);
    }
  };

  const startSmsRetriever = () => {
    SmsRetriever.startSmsRetriever(() => {
      SmsRetriever.addSmsListener(message => {
        analyzeIncomingSms(message.body);
      });
    });
  };

  const configureGoogleSignin = async () => {
    try {
      await GoogleSignin.configure({
        webClientId: 'YOUR_WEB_CLIENT_ID',
        offlineAccess: true,
      });
      const user = await GoogleSignin.signIn();
      setIsGmailAuthorized(true);
      startGmailMonitoring();
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled the Google Sign-In process');
      } else {
        console.error('Error configuring Google Sign-In:', error);
      }
    }
  };

  const startGmailMonitoring = async () => {
    try {
      const messages = await Gmail.listMessages();
      messages.forEach(message => {
        Gmail.getMessageById(message.id).then(msg => {
          analyzeIncomingEmail(msg);
        });
      });
    } catch (error) {
      console.error('Error fetching Gmail messages:', error);
    }
  };

  const analyzeIncomingSms = smsBody => {
    // Implement your SMS analysis logic here
    // Check for suspicious patterns or keywords
    if (isSuspicious(smsBody)) {
      const suspiciousActivity = {
        type: 'SMS',
        content: smsBody,
      };
      handleSuspiciousActivity(suspiciousActivity);
    }
  };

  const analyzeIncomingEmail = email => {
    // Implement your email analysis logic here
    // Check the email subject, body, and other relevant properties
    if (isSuspicious(email.subject) || isSuspicious(email.body)) {
      const suspiciousActivity = {
        type: 'Email',
        subject: email.subject,
        body: email.body,
      };
      handleSuspiciousActivity(suspiciousActivity);
    }
  };

  const isSuspicious = content => {
    // Implement your logic to detect suspicious content
    // This is a simple example, you'll need to customize it
    return content.toLowerCase().includes('scam');
  };

  const handleSuspiciousActivity = activity => {
    setSuspiciousActivities(prevActivities => [...prevActivities, activity]);
    triggerNotification(activity);
  };

  const triggerNotification = activity => {
    PushNotification.createChannel(
      {
        channelId: 'suspicious-activity-channel',
        channelName: 'Suspicious Activity Channel',
      },
      () => {
        PushNotification.localNotification({
          channelId: 'suspicious-activity-channel',
          title: `Suspicious ${activity.type} Detected`,
          message:
            activity.type === 'SMS'
              ? activity.content
              : `Subject: ${activity.subject}\nBody: ${activity.body}`,
        });
      },
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Suspicious Activity Monitor</Text>
      {suspiciousActivities.map((activity, index) => (
        <View key={index} style={styles.activityItem}>
          <Text style={styles.activityType}>{activity.type}:</Text>
          <Text style={styles.activityContent}>
            {activity.type === 'SMS'
              ? activity.content
              : `Subject: ${activity.subject}\nBody: ${activity.body}`}
          </Text>
        </View>
      ))}
      {!isGmailAuthorized && (
        <Button title="Sign in with Google" onPress={configureGoogleSignin} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  activityItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    width: '100%',
  },
  activityType: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activityContent: {
    fontSize: 14,
    color: '#666',
  },
});

export default App;
