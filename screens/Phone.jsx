import React, {useState, useEffect, useContext, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  PermissionsAndroid,
} from 'react-native';
import CallDetectorManager from 'react-native-call-detection';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';
import {supabase} from '../supabase'; // Import your Supabase client instance
import {useTask} from '../TaskContext'; // Import useTask from TaskContext
import {AuthContext} from '../AuthContext';

const formatPhoneNumber = phoneNumber => {
  if (!phoneNumber) return '';
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length < 10) return '';
  return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
    6,
  )}`;
};

const Phone = () => {
  const {user, signOut} = useContext(AuthContext);
  const {taskStarted, startTask, stopTask} = useTask();
  const [incomingCallNumber, setIncomingCallNumber] = useState(null);
  const [isIncomingCallScammer, setIsIncomingCallScammer] = useState(false);
  const [isTaskRunning, setIsTaskRunning] = useState(taskStarted);

  const callDetector = useRef(null);

  useEffect(() => {
    if (user) {
      console.log('User email:', user.email);
      console.log('User UID:', user.id); // Changed from user.uid to user.id for Supabase
    } else {
      // Assuming you have access to navigation
      // navigation.navigate('Login');
    }
  }, [user]);

  useEffect(() => {
    requestCallPhonePermission();
    setupCallDetector();

    return () => {
      if (callDetector.current) {
        callDetector.current.dispose();
      }
    };
  }, []);

  const requestCallPhonePermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        {
          title: 'Phone State Permission',
          message:
            'This app needs access to your phone state to detect incoming calls.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Phone state permission granted');
      } else {
        console.log('Phone state permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const setupCallDetector = () => {
    try {
      callDetector.current = new CallDetectorManager(
        async (event, number) => {
          if (event === 'Incoming') {
            console.log('Incoming call from:', number);
            setIncomingCallNumber(number);
            const scamDetails = await fetchCallScamDetails(number);
            if (scamDetails && scamDetails.length > 0) {
              console.log('Scammer detected:', number);
              setIsIncomingCallScammer(true);
              Alert.alert(
                'Scam Call Detected',
                `Number: ${scamDetails[0].scam_no}\nMessage: ${scamDetails[0].scam_mes}`,
                [{text: 'OK', onPress: () => console.log('Alert closed')}],
                {cancelable: false},
              );
              PushNotification.localNotification({
                channelId: 'default-channel-id',
                title: 'Scam Call Detected',
                message: `Number: ${scamDetails[0].scam_no} is a scam number.`,
              });
            } else {
              setIsIncomingCallScammer(false);
              Alert.alert(
                'Incoming Call',
                `Incoming call from: ${formatPhoneNumber(number)}`,
                [{text: 'OK', onPress: () => console.log('Alert closed')}],
                {cancelable: false},
              );
            }
          }
        },
        true,
        () => {
          console.log('Call Detector initialized successfully');
        },
        err => {
          console.error('Call Detector failed to initialize', err);
        },
      );
    } catch (error) {
      console.error('Error setting up Call Detector:', error);
    }
  };

  const fetchCallScamDetails = async phoneNumber => {
    try {
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      console.log('Fetching scam details for:', cleanPhoneNumber);
      const {data, error} = await supabase
        .from('scammers')
        .select('scam_no, scam_mes')
        .eq('scam_no', cleanPhoneNumber);

      if (error) {
        console.error('Error fetching call scam details:', error);
        return null;
      }

      console.log('Scam details fetched:', data);
      return data;
    } catch (error) {
      console.error('Error in fetchCallScamDetails:', error);
      return null;
    }
  };

  const veryIntensiveTask = async taskData => {
    await new Promise(async resolve => {
      for (let i = 0; BackgroundService.isRunning(); i++) {
        console.log('Running background task:', i);
        await new Promise(r => setTimeout(r, 1000));
      }
      resolve();
    });
  };

  const options = {
    taskName: 'ScamDetection',
    taskTitle: 'Scam Call Detection Running',
    taskDesc: 'Detecting scam calls in the background.',
    taskIcon: {
      name: 'ic_launcher',
      type: 'mipmap',
    },
    color: '#ff0000',
    linkingURI: 'yourSchemeHere://chat/jane',
    parameters: {
      delay: 1000,
    },
    notifications: {
      foreground: false,
      priority: 'high',
      sticky: true,
      alertAction: 'view',
      actions: ['Stop Task'],
    },
  };

  const onStartTaskPress = async () => {
    await BackgroundService.start(veryIntensiveTask, options);
    await startTask();
    setIsTaskRunning(true);
    showNotification(
      'Background Task Started',
      'The background task for call detection has started.',
    );
  };

  const onStopTaskPress = async () => {
    await BackgroundService.stop();
    await stopTask();
    setIsTaskRunning(false);
    showNotification(
      'Background Task Stopped',
      'The background task for call detection has been stopped.',
    );
  };

  const showNotification = (title, message) => {
    PushNotification.localNotification({
      channelId: 'default-channel-id',
      title,
      message,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerText}>Scam Call Detection</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.card}>
          {incomingCallNumber ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Incoming Call</Text>
              </View>
              <Text style={styles.smsSender}>
                From: {formatPhoneNumber(incomingCallNumber)}{' '}
                {isIncomingCallScammer && '(Scammer)'}
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            isTaskRunning ? styles.buttonStop : styles.buttonStart,
          ]}
          onPress={isTaskRunning ? onStopTaskPress : onStartTaskPress}>
          <Text style={styles.buttonText}>
            {isTaskRunning ? 'Stop Task' : 'Start Task'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  card: {
    padding: 16,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    marginBottom: 8,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  smsSender: {
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonStart: {
    backgroundColor: '#007bff',
  },
  buttonStop: {
    backgroundColor: '#ff4d4d',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default Phone;
