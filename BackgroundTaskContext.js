import React, {createContext, useContext, useState} from 'react';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';

const BackgroundTaskContext = createContext();

export const BackgroundTaskProvider = ({children}) => {
  const [isTaskRunning, setIsTaskRunning] = useState(false);

  const backgroundTask = async taskDataArguments => {
    const {delay} = taskDataArguments;
    await new Promise(async resolve => {
      while (BackgroundService.isRunning()) {
        // Your background functionality here
        console.log('Background task running...');
        await sleep(delay);
      }
      removePersistentNotification();
      resolve();
    });
  };

  const startTask = async () => {
    if (!isTaskRunning) {
      const options = {
        taskName: 'Background Task',
        taskTitle: 'Background Task Running',
        taskDesc: 'Your task is running in the background',
        taskIcon: {
          name: 'ic_launcher',
          type: 'mipmap',
        },
        color: '#ff0000',
        parameters: {
          delay: 60000, // How often to check for new data
        },
      };

      await BackgroundService.start(backgroundTask, options);
      setIsTaskRunning(true);
      showPersistentNotification();
    }
  };

  const stopTask = async () => {
    await BackgroundService.stop();
    setIsTaskRunning(false);
    removePersistentNotification();
  };

  const showPersistentNotification = () => {
    PushNotification.localNotification({
      channelId: 'default-channel-id',
      title: 'Background Task Active',
      message: 'Your task is running in the background',
      ongoing: true,
      autoCancel: false,
      importance: 'high',
      priority: 'high',
    });
  };

  const removePersistentNotification = () => {
    PushNotification.cancelAllLocalNotifications();
  };

  return (
    <BackgroundTaskContext.Provider
      value={{
        isTaskRunning,
        startTask,
        stopTask,
      }}>
      {children}
    </BackgroundTaskContext.Provider>
  );
};

export const useBackgroundTask = () => {
  return useContext(BackgroundTaskContext);
};

// Simple sleep function
const sleep = time => new Promise(resolve => setTimeout(() => resolve(), time));
