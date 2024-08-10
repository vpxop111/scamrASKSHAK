import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  BackHandler,
  AppState,
} from 'react-native';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';

// Configure PushNotification
PushNotification.configure({
  onRegister: function (token) {
    console.log('TOKEN:', token);
  },
  onNotification: function (notification) {
    console.log('NOTIFICATION:', notification);
  },
  senderID: 'YOUR_FCM_SENDER_ID',
  permissions: {
    alert: true,
    badge: true,
    sound: true,
  },
  popInitialNotification: true,
  requestPermissions: true,
});

const sleep = time => new Promise(resolve => setTimeout(() => resolve(), time));

const veryIntensiveTask = async taskDataArguments => {
  const {delay} = taskDataArguments;
  let count = 0;

  const showAlert = () => {
    Alert.alert('Task Update', 'Counter has reached 20!');
  };

  const showNotification = () => {
    PushNotification.localNotification({
      channelId: 'default-channel-id',
      title: 'Task Update',
      message: 'Counter has reached 20!',
    });
  };

  while (BackgroundService.isRunning()) {
    console.log(count);

    // Update notification
    await BackgroundService.updateNotification({
      taskDesc: `Running task: ${count}`,
    });

    if (count === 20) {
      showNotification();

      if (AppState.currentState === 'active') {
        showAlert();
      }
    }

    count += 1;
    await sleep(delay);
  }
};

const options = {
  taskName: 'Example',
  taskTitle: 'ExampleTask title',
  taskDesc: 'ExampleTask description',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#ff00ff',
  linkingURI: 'yourSchemeHere://chat/jane',
  parameters: {
    delay: 1000,
  },
};

export default function App() {
  const [isTaskRunning, setIsTaskRunning] = useState(false);

  const startTask = async () => {
    console.log('Starting background task');
    setIsTaskRunning(true);
    try {
      await BackgroundService.start(veryIntensiveTask, options);
      // Initial notification update
      await BackgroundService.updateNotification({
        taskDesc: 'Task has started and is running...',
      });

      // Simulate closing the app
      BackHandler.exitApp(); // This will move the app to the background
    } catch (error) {
      console.error('Error starting background task:', error);
    }
  };

  const stopTask = async () => {
    console.log('Stopping background task');
    setIsTaskRunning(false);
    try {
      await BackgroundService.stop();
      await BackgroundService.updateNotification({
        taskDesc: 'Task stopped',
      });
    } catch (error) {
      console.error('Error stopping background task:', error);
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      if (isTaskRunning) {
        // Prevent going back if the task is running
        return true;
      }
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    };
  }, [isTaskRunning]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Background Task Example</Text>
      <Button title="Start Background Task" onPress={startTask} />
      <Button title="Stop Background Task" onPress={stopTask} />
      <Text>{isTaskRunning ? 'Task is running...' : 'Task is stopped'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5fcff',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});
