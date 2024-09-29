import React, { createContext, useState, useEffect, useContext } from 'react';
import { DeviceEventEmitter, NativeModules } from 'react-native';
import BackgroundService from 'react-native-background-actions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import PushNotification from 'react-native-push-notification';
import { supabase } from './supabase';
import { AuthContext } from './AuthContext';

const { SmsListenerModule } = NativeModules;

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

  // Fetch latest Gmail messages
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
          await sendToApi('gmail', messageData.snippet, messageData.payload.headers.find(header => header.name === 'From').value);
        } else {
          console.log('[BackgroundTask] No new Gmail messages found');
        }
      } catch (error) {
        console.error('[BackgroundTask] Error fetching email:', error);
      }
    } else {
      console.log('[BackgroundTask] User not logged in, skipping Gmail fetch');
    }
  };

  // Send SMS or Email to the API and process the response
  const sendToApi = async (type, content, sender = '') => {
    let apiEndpoint;
    if (type === 'sms') {
      apiEndpoint = 'https://varun324242-sssssss.hf.space/predict';
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
        body: JSON.stringify({ message: content }),
      });
      const result = await response.json();
      console.log(`[BackgroundTask] ${type.toUpperCase()} API Response:`, result);

      if (result.predicted_result.toLowerCase() === 'scam') {
        showNotification(type, result.confidence);
        if (type === 'sms') {
          await storeScamMessage(sender, content);
        } else if (type === 'gmail') {
          await storeScamEmail(sender, result.subject, content);
        }
      }
    } catch (error) {
      console.error(`Error sending ${type} to API:`, error);
    }
  };

  // Show notification for scam detection
  const showNotification = (type, confidence) => {
    PushNotification.localNotification({
      channelId: 'scam-detection',
      title: `Potential ${type.toUpperCase()} Scam Detected`,
      message: `Confidence: ${confidence}%. Tap for more details.`,
      playSound: true,
      soundName: 'default',
    });
  };

  // Store scam SMS message in Supabase
  const storeScamMessage = async (phoneNumber, message) => {
    try {
      if (!user || !user.email) {
        console.error('User email not found');
        return;
      }

      const cleanPhoneNumber = phoneNumber.replace(/\D/g, ''); // Clean phone number
      console.log(`[BackgroundTask] Storing scam SMS - Phone: ${cleanPhoneNumber}, Message: ${message}`);
      
      const { data, error } = await supabase
        .from('scamsms')
        .insert([{ scam_no: cleanPhoneNumber, scam_mes: message, sid: user.email }]);

      if (error) {
        console.error('Error storing scam SMS in Supabase:', error);
      } else {
        console.log('Scam SMS successfully stored in Supabase:', data);
      }
    } catch (error) {
      console.error('Error storing scam SMS:', error);
    }
  };

  // Store scam Gmail message in Supabase
  const storeScamEmail = async (sender, subject, body) => {
    try {
      if (!user || !user.email) {
        console.error('User email not found');
        return;
      }

      console.log(`[BackgroundTask] Storing scam email - Sender: ${sender}, Subject: ${subject}, Body: ${body}`);
      
      const { data, error } = await supabase
        .from('scam_email')
        .insert([{ sid: user.email, sender: sender, scam_head: subject, scam_body: body }]);

      if (error) {
        console.error('Error storing scam email in Supabase:', error);
      } else {
        console.log('Scam email successfully stored in Supabase:', data);
      }
    } catch (error) {
      console.error('Error storing scam email:', error);
    }
  };

  // Start the background task
  const startTask = async () => {
    if (!isTaskRunning) {
      setIsTaskRunning(true);
      await AsyncStorage.setItem('backgroundTaskStatus', 'running');
      console.log('[BackgroundTask] Background task is starting...');
      
      if (SmsListenerModule) {
        console.log('SmsListenerModule is available');
        SmsListenerModule.startListeningToSMS();
        console.log('Called startListeningToSMS method');
      } else {
        console.log('SmsListenerModule is not available');
      }

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
        ongoing: true, // Prevent the notification from being dismissed
      });
      console.log('[BackgroundTask] Background task started');
    }
  };

  // Stop the background task
  const stopTask = async () => {
    if (isTaskRunning) {
      await BackgroundService.stop();
      setIsTaskRunning(false);
      await AsyncStorage.removeItem('backgroundTaskStatus');
      console.log('[BackgroundTask] Background task stopped');
    }
  };

  // Define the background task function
  const backgroundTask = async (taskDataArguments) => {
    const { delay } = taskDataArguments;
    await new Promise(async (resolve) => {
      const smsListener = DeviceEventEmitter.addListener('onSMSReceived', async (message) => {
        console.log('SMS received in background:', message);
        const { messageBody, senderPhoneNumber } = JSON.parse(message);
        await sendToApi('sms', messageBody, senderPhoneNumber);
      });

      while (BackgroundService.isRunning()) {
        await fetchLatestEmail(); // Fetch Gmail
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      smsListener.remove();
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