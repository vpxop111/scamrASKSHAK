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
  const { user } = useContext(AuthContext); // Use user from AuthContext
  const [latestEmailId, setLatestEmailId] = useState(null); // Store latest email ID

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
    if (user) { // Check if user is available from AuthContext
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
        console.log('[BackgroundTask] Gmail API Response:', data);

        if (data.messages && data.messages.length > 0) {
          const messageId = data.messages[0].id;
          if (messageId !== latestEmailId) {
            setLatestEmailId(messageId);
            const messageResponse = await fetch(
              `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            const messageData = await messageResponse.json();
            console.log('[BackgroundTask] Latest Gmail:', messageData);
            await sendEmailToApi(messageData); // Call the function to send email data to your API
          }
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

  // Send SMS data to the API
  const sendToApi = async (type, messageBody, senderPhoneNumber) => {
    let apiEndpoint = 'https://varun324242-sssssss.hf.space/predict';
    
    // Construct the payload for SMS
    const payload = {
      message: messageBody,
    };

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), // Send the complete payload
      });

      if (!response.ok) {
        console.error('[BackgroundTask] Error sending SMS to API:', response.statusText);
        return;
      }

      const result = await response.json();
      console.log('SMS API Response:', result);
    } catch (error) {
      console.error('Error sending SMS to API:', error);
    }
  };

  // Send Gmail email data to the API
  const sendEmailToApi = async email => {
    const subjectHeader = email.payload.headers.find(
      header => header.name.toLowerCase() === 'subject',
    );
    const subject = subjectHeader ? subjectHeader.value : 'No subject';

    const bodyPart = email.payload.parts
      ? email.payload.parts.find(part => part.mimeType === 'text/plain')?.body?.data
      : email.snippet;
    const body = bodyPart ? base64UrlDecode(bodyPart) : 'No body';

    const senderHeader = email.payload.headers.find(header => header.name.toLowerCase() === 'from');
    const sender = senderHeader ? senderHeader.value : 'Unknown sender';

    const emailData = { subject, body, sender }; // Ensure all required fields are included

    try {
      const response = await fetch(
        'https://varun324242-gmail.hf.space/predict',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailData), // Send the complete payload
        },
      );

      if (!response.ok) {
        console.error('[BackgroundTask] Error sending email to API:', response.statusText);
        return;
      }

      const result = await response.json();
      console.log('API Response:', result);

      if (result.predicted_result && result.predicted_result.toLowerCase() === 'scam') {
        await storeScamEmail(sender, subject, body);
        showNotification('gmail', sender); // Notify about the scam
      }
    } catch (error) {
      console.error('Error sending email to API:', error);
    }
  };

  // Base64 URL Decode Function
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

  // Show notification for scam detection
  const showNotification = (type, sender) => {
    PushNotification.localNotification({
      channelId: 'scam-detection',
      title: `Potential ${type.toUpperCase()} Scam Detected`,
      message: `From: ${sender}. Tap for more details.`,
      playSound: true,
      soundName: 'default',
    });
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
        await sendToApi('sms', messageBody, senderPhoneNumber); // Send SMS to API
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