import React, { createContext, useState, useEffect, useContext } from 'react';
import BackgroundService from 'react-native-background-actions';
import SmsAndroid from 'react-native-get-sms-android';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthContext } from './AuthContext';
import PushNotification from 'react-native-push-notification';

export const BackgroundTaskContext = createContext();

export const useBackgroundTask = () => useContext(BackgroundTaskContext);

const BackgroundTaskProvider = ({ children }) => {
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [timer, setTimer] = useState(60);
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
        soundName: 'default',
        importance: 4,
        vibrate: true,
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

  const fetchAndProcessGmail = async () => {
    console.log('[BackgroundTask] Fetching Gmail...');
    if (user) {
      try {
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
          await sendToApi('gmail', messageData.snippet);
        }
      } catch (error) {
        console.error('[BackgroundTask] Error fetching Gmail:', error);
      }
    } else {
      console.log('[BackgroundTask] User not logged in, skipping Gmail fetch');
    }
  };

  const sendToApi = async (type, content) => {
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
      BackgroundService.start(backgroundTask, {
        taskName: 'SMS and Gmail Scanner',
        taskTitle: 'Scanning for Scams',
        taskDesc: 'Checking SMS and Gmail',
        taskIcon: {
          name: 'ic_launcher',
          type: 'mipmap',
        },
        color: '#ff00ff',
        parameters: {
          delay: 60000,
        },
      });
      console.log('[BackgroundTask] Background task started');
    }
  };

  const stopTask = async () => {
    if (isTaskRunning) {
      await BackgroundService.stop();
      setIsTaskRunning(false);
      setTimer(60);
      await AsyncStorage.removeItem('backgroundTaskStatus');
      console.log('[BackgroundTask] Background task stopped');
    }
  };

  const backgroundTask = async (taskDataArguments) => {
    const { delay } = taskDataArguments;
    await new Promise(async (resolve) => {
      while (BackgroundService.isRunning()) {
        await fetchAndProcessSms();
        await fetchAndProcessGmail();
        await new Promise((r) => setTimeout(r, delay));
      }
    });
  };

  return (
    <BackgroundTaskContext.Provider value={{ isTaskRunning, timer, startTask, stopTask }}>
      {children}
    </BackgroundTaskContext.Provider>
  );
};

export default BackgroundTaskProvider;