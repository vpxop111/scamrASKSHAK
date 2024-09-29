import React, { useEffect, useState } from 'react';
import { View, Text, PermissionsAndroid, DeviceEventEmitter, Button, NativeModules } from 'react-native';
import BackgroundService from 'react-native-background-actions';

const { SmsListenerModule } = NativeModules; // Import the native module

const sleep = (time) => new Promise((resolve) => setTimeout(() => resolve(), time));

const sendSmsToServer = async (messageBody) => {
  try {
    const response = await fetch('https://varun324242-s1.hf.space/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: messageBody
      }),
    });
    const data = await response.json();
    console.log('Response from server:', data);
    return data;
  } catch (error) {
    console.error('Error sending SMS to server:', error);
  }
};

const Scamai = () => {
  const [message, setMessage] = useState('');
  const [isBackgroundServiceRunning, setIsBackgroundServiceRunning] = useState(false);

  const requestSmsPermission = async () => {
    try {
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
      if (permission === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('SMS permission granted');
      } else {
        console.log('SMS permission denied');
      }
    } catch (err) {
      console.log('Error requesting SMS permission:', err);
    }
  };

  const checkSmsListener = () => {
    console.log('Checking SMS Listener Module...');
    if (SmsListenerModule) {
      console.log('SmsListenerModule is available');
      SmsListenerModule.startListeningToSMS();
      console.log('Called startListeningToSMS method');
    } else {
      console.log('SmsListenerModule is not available');
    }
  };

  const startBackgroundService = async () => {
    const options = {
      taskName: 'SMS Listener',
      taskTitle: 'Listening for SMS',
      taskDesc: 'This app is running in the background to listen for SMS messages.',
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#ff0000',
      linkingURI: 'yourapp://chat',
      parameters: {
        delay: 5000,
      },
    };

    await BackgroundService.start(backgroundTask, options);
    setIsBackgroundServiceRunning(true);
    console.log('Background service started');
  };

  const stopBackgroundService = async () => {
    await BackgroundService.stop();
    setIsBackgroundServiceRunning(false);
    console.log('Background service stopped');
  };

  useEffect(() => {
    requestSmsPermission();

    const foregroundListener = DeviceEventEmitter.addListener('onSMSReceived', async (message) => {
      console.log('SMS received in foreground:', message);
      const { messageBody, senderPhoneNumber } = JSON.parse(message);
      setMessage(messageBody);
      console.log(`Message from ${senderPhoneNumber}: ${messageBody}`);
      
      const serverResponse = await sendSmsToServer(messageBody);
      console.log('Server response in foreground:', serverResponse);
    });

    return () => {
      foregroundListener.remove();
      if (isBackgroundServiceRunning) {
        BackgroundService.stop();
      }
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>SMS Data:</Text>
      <Text>{message}</Text>
      <Button title="Start Listening for SMS" onPress={checkSmsListener} />
      <Button 
        title={isBackgroundServiceRunning ? "Stop Background Service" : "Start Background Service"} 
        onPress={isBackgroundServiceRunning ? stopBackgroundService : startBackgroundService}
      />
    </View>
  );
};

export default Scamai;