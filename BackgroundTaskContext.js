import React, { createContext, useState, useEffect, useContext } from 'react';
import BackgroundService from 'react-native-background-actions';
import SmsAndroid from 'react-native-get-sms-android';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import PushNotification from 'react-native-push-notification';
import { AuthContext } from './AuthContext';

// Define your Google Client IDs
const WEB_CLIENT_ID = '483287191355-lr9eqf88sahgfsg63eaoq1p37dp89rh3.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = '483287191355-29itib6r943rprhcruog9s3aifengdmc.apps.googleusercontent.com';

export const BackgroundTaskContext = createContext();

export const useBackgroundTask = () => useContext(BackgroundTaskContext);

const BackgroundTaskProvider = ({ children }) => {
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    checkTaskStatus();
    setupNotifications();
  }, []);

  const setupNotifications = () => {
    PushNotification.createChannel(
      {
        channelId: 'scam-detection',
        channelName: 'Scam Detection Notifications',
        channelDescription: 'Notifications for detected scams',
      },
      (created) => console.log(`createChannel returned '${created}'`)
    );
  };

  const checkTaskStatus = async () => {
    const status = await AsyncStorage.getItem('backgroundTaskStatus');
    setIsTaskRunning(status === 'running');
  };

  const fetchAndProcessSms = async () => {
    console.log('[BackgroundTask] Fetching SMS...');
    SmsAndroid.list(
      JSON.stringify({ box: 'inbox', indexFrom: 0, maxCount: 1 }),
      (fail) => console.log('Failed to fetch SMS:', fail),
      async (count, smsList) => {
        const messages = JSON.parse(smsList);
        if (messages.length > 0) {
          const latestSms = messages[0];
          console.log('[BackgroundTask] Latest SMS:', latestSms);
          await sendToApi('sms', latestSms.body);
        }
      }
    );
  };

  const fetchLatestEmail = async () => {
    console.log('[BackgroundTask] Fetching latest Gmail...');
    if (user) {
      try {
        await GoogleSignin.configure({
          offlineAccess: true,
          webClientId: WEB_CLIENT_ID,
          androidClientId: ANDROID_CLIENT_ID,
          scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
        });

        const { accessToken } = await GoogleSignin.getTokens();
        const response = await fetch(
          'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=1',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          const messageId = data.messages[0].id;
          const messageResponse = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          const messageData = await messageResponse.json();
          console.log('[BackgroundTask] Latest Gmail:', messageData);
          await sendEmailToApi(messageData);
        }
      } catch (error) {
        console.error('[BackgroundTask] Error fetching email:', error);
      }
    } else {
      console.log('[BackgroundTask] User not logged in, skipping Gmail fetch');
    }
  };

  const sendEmailToApi = async email => {
    const subjectHeader = email.payload.headers.find(
      header => header.name.toLowerCase() === 'subject',
    );
    const subject = subjectHeader ? subjectHeader.value : 'No subject';

    const bodyPart = email.payload.parts
      ? email.payload.parts.find(part => part.mimeType === 'text/plain')?.body.data
      : email.snippet;
    const body = bodyPart ? base64UrlDecode(bodyPart) : 'No body';

    const senderHeader = email.payload.headers.find(header => header.name.toLowerCase() === 'from');
    const sender = senderHeader ? senderHeader.value : 'Unknown sender';

    const emailData = { subject, body };

    try {
      const response = await fetch(
        'https://varun324242-gmail.hf.space/predict',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailData),
        },
      );
      const result = await response.json();
      console.log('API Response:', result);
      // Handle scam detection and notifications
      if (result.predicted_result.toLowerCase() === 'scam') {
        showNotification('gmail', result.confidence);
      }
    } catch (error) {
      console.error('Error sending email to API:', error);
    }
  };

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

  const sendToApi = async (type, content) => {
    let apiEndpoint;
    if (type === 'sms') {
      apiEndpoint = 'https://varun324242-s1.hf.space/predict';
    } else if (type === 'gmail') {
      apiEndpoint = 'https://varun324242-gmail.hf.space/predict';
    } else {
      console.error('Invalid type for API call');
      return;
    }

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      });
      const result = await response.json();
      console.log(`[BackgroundTask] ${type.toUpperCase()} API Response:`, result);
      
      if (result.predicted_result.toLowerCase() === 'scam') {
        showNotification(type, result.confidence);
      }
    } catch (error) {
      console.error(`Error sending ${type} to API:`, error);
    }
  };

  const showNotification = (type, confidence) => {
    PushNotification.localNotification({
      channelId: 'scam-detection',
      title: `Potential ${type.toUpperCase()} Scam Detected`,
      message: `Confidence: ${confidence}%. Tap for more details.`,
      playSound: true,
      soundName: 'default',
    });
  };

  const startTask = async () => {
    if (!isTaskRunning) {
      setIsTaskRunning(true);
      await AsyncStorage.setItem('backgroundTaskStatus', 'running');
      console.log('[BackgroundTask] Background task is starting...');
      BackgroundService.start(backgroundTask, {
        taskName: 'SMS and Gmail Scanner',
        taskTitle: 'Scanning for Scams',
        taskDesc: 'Checking SMS and Gmail every minute',
        taskIcon: {
          name: 'ic_launcher',
          type: 'mipmap',
        },
        color: '#ff00ff',
        parameters: {
          delay: 60000, // 60 seconds
        },
      });
      console.log('[BackgroundTask] Background task started');
    }
  };

  const stopTask = async () => {
    if (isTaskRunning) {
      await BackgroundService.stop();
      setIsTaskRunning(false);
      await AsyncStorage.removeItem('backgroundTaskStatus');
      console.log('[BackgroundTask] Background task stopped');
    }
  };

  const backgroundTask = async (taskDataArguments) => {
    const { delay } = taskDataArguments;
    let timer = 60;  // Timer state in seconds
    await new Promise(async (resolve) => {
      while (BackgroundService.isRunning()) {
        console.log(`[BackgroundTask] Time remaining until next fetch: ${timer} seconds.`);
        await fetchAndProcessSms();  // Fetch SMS
        await fetchLatestEmail(); // Fetch Gmail
        await new Promise((r) => setTimeout(r, delay)); // Wait for the delay
        timer -= 1;  // Decrement the timer
        if (timer <= 0) timer = 60;  // Reset timer
      }
      resolve();
    });
  };

  return (
    <BackgroundTaskContext.Provider value={{ isTaskRunning, startTask, stopTask }}>
      {children}
    </BackgroundTaskContext.Provider>
  );
};

export default BackgroundTaskProvider;