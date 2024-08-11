import React, {useState, useEffect, useRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  PermissionsAndroid,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import {supabase} from './supabase';
import CallDetectorManager from 'react-native-call-detection';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width} = Dimensions.get('window');

PushNotification.createChannel(
  {
    channelId: 'sms-guard-channel',
    channelName: 'SMS Guard Notifications',
    channelDescription: 'Notifications for SMS Guard app',
    soundName: 'default',
    importance: 4,
    vibrate: true,
  },
  created => console.log(`createChannel returned '${created}'`),
);

PushNotification.configure({
  onRegister: function (token) {
    console.log('TOKEN:', token);
  },
  onNotification: function (notification) {
    console.log('NOTIFICATION:', notification);
  },
  permissions: {
    alert: true,
    badge: true,
    sound: true,
  },
  popInitialNotification: true,
  requestPermissions: true,
});

const sleep = time => new Promise(resolve => setTimeout(() => resolve(), time));

const fetchScamDetails = async phoneNumber => {
  try {
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
    const {data, error} = await supabase
      .from('scammers')
      .select('scam_no, scam_mes')
      .eq('scam_no', cleanPhoneNumber)
      .single();

    if (error) {
      console.error('Error fetching scam details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in fetchScamDetails:', error);
    return null;
  }
};

const Sms = () => {
  const [latestSms, setLatestSms] = useState('');
  const [smsSender, setSmsSender] = useState('');
  const [predictedResult, setPredictedResult] = useState('');
  const [timer, setTimer] = useState(20);
  const [apiStatus, setApiStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastProcessedSmsId, setLastProcessedSmsId] = useState(null);
  const [scammerStatus, setScammerStatus] = useState({
    isScammer: false,
    checkedSender: null,
    stored: false,
  });
  const [scamMessages, setScamMessages] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [incomingCallNumber, setIncomingCallNumber] = useState('');
  const [isIncomingCallScammer, setIsIncomingCallScammer] = useState(false);
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const timerRef = useRef(null);
  const scammerCacheRef = useRef({});
  const notifiedSmsRef = useRef(new Set());

  useEffect(() => {
    const initializeApp = async () => {
      await requestReadSmsPermission();
      checkAndStartBackgroundTask();
      await loadNotifiedSms();
    };

    initializeApp();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const loadNotifiedSms = async () => {
    try {
      const notifiedSms = await AsyncStorage.getItem('notifiedSms');
      if (notifiedSms) {
        notifiedSmsRef.current = new Set(JSON.parse(notifiedSms));
      }
    } catch (error) {
      console.error('Error loading notified SMS:', error);
    }
  };

  const saveNotifiedSms = async () => {
    try {
      await AsyncStorage.setItem(
        'notifiedSms',
        JSON.stringify(Array.from(notifiedSmsRef.current)),
      );
    } catch (error) {
      console.error('Error saving notified SMS:', error);
    }
  };

  useEffect(() => {
    const updateSenderDisplay = async () => {
      if (smsSender) {
        const isScam = await checkIfScammer(smsSender);
        setSmsSender(prevSender =>
          isScam
            ? `${prevSender.replace(/ \(Scammer\)$/, '')} (Scammer)`
            : prevSender.replace(/ \(Scammer\)$/, ''),
        );
        setScammerStatus(prev => ({
          ...prev,
          isScammer: isScam,
          checkedSender: smsSender,
        }));
      }
    };

    updateSenderDisplay();
  }, [smsSender]);

  useEffect(() => {
    let callDetector;

    const setupCallDetector = async () => {
      try {
        callDetector = new CallDetectorManager(
          async (event, number) => {
            if (event === 'Incoming') {
              console.log('Incoming call from:', number);
              const scamDetails = await fetchScamDetails(number);
              if (scamDetails) {
                console.log('Scammer detected:', number);
                setIncomingCallNumber(number);
                setIsIncomingCallScammer(true);
                PushNotification.localNotification({
                  channelId: 'sms-guard-channel',
                  title: 'Scam Call Detected',
                  message: `Number: ${scamDetails.scam_no}\nMessage: ${scamDetails.scam_mes}`,
                });
              } else {
                setIncomingCallNumber(number);
                setIsIncomingCallScammer(false);
                PushNotification.localNotification({
                  channelId: 'sms-guard-channel',
                  title: 'Incoming Call',
                  message: `Incoming call from: ${number}`,
                });
              }
            }
          },
          true,
          () => {
            console.log('Call Detector is initialized successfully');
          },
          err => {
            console.error('Call Detector failed to initialize', err);
          },
        );
      } catch (error) {
        console.error('Error setting up Call Detector:', error);
      }
    };

    setupCallDetector();

    return () => {
      if (callDetector) {
        callDetector.dispose();
      }
    };
  }, []);

  const requestReadSmsPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'Read SMS Permission',
          message: 'This app needs access to your SMS messages to read them.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        readLatestSMS();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const readLatestSMS = () => {
    SmsAndroid.list(
      JSON.stringify({
        box: 'inbox',
        indexFrom: 0,
        maxCount: 1,
      }),
      fail => {
        console.log('Failed with this error: ' + fail);
      },
      (count, smsList) => {
        const messages = JSON.parse(smsList);
        if (messages.length > 0) {
          const latestMessage = messages[0].body;
          const sender = messages[0].address;
          const messageId = messages[0]._id;
          if (messageId !== lastProcessedSmsId) {
            setLatestSms(latestMessage);
            setSmsSender(sender);
            setLastProcessedSmsId(messageId);
          }
        }
      },
    );
  };

  const checkIfScammer = async sender => {
    console.log('Checking if sender is a scammer:', sender);

    const cleanSender = sender.replace(/ \(Scammer\)$/, '');

    if (cleanSender in scammerCacheRef.current) {
      return scammerCacheRef.current[cleanSender];
    }

    try {
      const scamDetails = await fetchScamDetails(cleanSender);
      const isScammer = !!scamDetails;
      scammerCacheRef.current[cleanSender] = isScammer;

      console.log(
        isScammer
          ? `Scammer detected: ${cleanSender}`
          : `Sender is not a scammer: ${cleanSender}`,
      );

      return isScammer;
    } catch (error) {
      console.error('Error in checkIfScammer:', error);
      return false;
    }
  };

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimer(20);
    timerRef.current = setInterval(() => {
      setTimer(prevTimer => {
        if (prevTimer === 1) {
          checkForNewMessage();
          return 20;
        }
        return prevTimer - 1;
      });
    }, 1000);
  };

  const checkForNewMessage = () => {
    if (!processing && !isChecking) {
      setIsChecking(true);
      readLatestSMS();
    }
  };

  const sendMessageToApi = async message => {
    if (!message) {
      setIsChecking(false);
      return;
    }

    setProcessing(true);
    setApiStatus('Sending message to API...');
    try {
      const response = await fetch(
        'https://varun324242-sssssss.hf.space/predict',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({message}),
        },
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      const result = data.predicted_result || 'No result found';
      setPredictedResult(result);
      setApiStatus('API response received');

      if (result.toLowerCase() === 'scam') {
        const cleanSender = smsSender.replace(/ \(Scammer\)$/, '');
        await storeScamMessage(cleanSender, message);
        setScammerStatus(prev => ({...prev, isScammer: true, stored: true}));
        scammerCacheRef.current[cleanSender] = true;

        // Check if we've already notified about this SMS
        if (!notifiedSmsRef.current.has(lastProcessedSmsId)) {
          // Show notification for scam message
          PushNotification.localNotification({
            channelId: 'sms-guard-channel',
            title: 'Scam SMS Detected',
            message: `From: ${cleanSender}\nMessage: ${message}`,
          });

          // Add this SMS to the notified set
          notifiedSmsRef.current.add(lastProcessedSmsId);
          await saveNotifiedSms();
        }
      }
    } catch (error) {
      console.error('Error sending message to API: ', error);
      setPredictedResult('Error sending message to API');
      setApiStatus('Error sending message to API');
    } finally {
      setProcessing(false);
      setIsChecking(false);
    }
  };

  const storeScamMessage = async (phoneNumber, message) => {
    try {
      if (typeof phoneNumber !== 'string') {
        console.error('Invalid phone number type');
        return;
      }

      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

      const {data, error} = await supabase
        .from('scammers')
        .insert([{scam_no: cleanPhoneNumber, scam_mes: message}]);

      if (error) {
        if (error.code === '23505') {
          console.log('Scammer already exists in the database.');
        } else {
          throw error;
        }
      } else {
        console.log('Scam message successfully stored.');
      }
    } catch (error) {
      console.error('Error storing scam message in Supabase: ', error);
    }
  };

  const fetchScamMessages = async phoneNumber => {
    try {
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      const {data, error} = await supabase
        .from('scammers')
        .select('scam_no, scam_mes')
        .eq('scam_no', cleanPhoneNumber);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setScamMessages(data);
        setModalVisible(true);
      } else {
        console.log('No scam messages found for this number');
        Alert.alert(
          'No Scam Messages',
          'No scam messages found for this number.',
        );
      }
    } catch (error) {
      console.error('Error fetching scam messages:', error);
      Alert.alert('Error', 'Failed to fetch scam messages. Please try again.');
    }
  };

  useEffect(() => {
    if (!processing && latestSms && !isChecking) {
      sendMessageToApi(latestSms);
    }
  }, [processing, latestSms, isChecking]);

  const checkAndStartBackgroundTask = async () => {
    try {
      const isTaskStarted = await AsyncStorage.getItem(
        'isBackgroundTaskStarted',
      );
      if (isTaskStarted === 'true') {
        setIsTaskRunning(true);
      }
    } catch (error) {
      console.error('Error checking background task status:', error);
    }
  };

  const veryIntensiveTask = async taskDataArguments => {
    const {delay} = taskDataArguments;
    await new Promise(async resolve => {
      for (let i = 0; BackgroundService.isRunning(); i++) {
        await readLatestSMS();
        await sleep(delay);
      }
    });
  };

  const options = {
    taskName: 'SMS Scanner',
    taskTitle: 'SMS Scanner',
    taskDesc: 'Scanning SMS messages...',
    taskIcon: {
      name: 'ic_launcher',
      type: 'mipmap',
    },
    color: '#ff00ff',
    linkingURI: 'yourSchemeHere://chat/jane',
    parameters: {
      delay: 20000,
    },
  };

  const startTask = async () => {
    if (!isTaskRunning) {
      console.log('Starting background task');
      setIsTaskRunning(true);
      try {
        await BackgroundService.start(veryIntensiveTask, options);
        await AsyncStorage.setItem('isBackgroundTaskStarted', 'true');
        startTimer();
      } catch (error) {
        console.error('Error starting background task:', error);
        setIsTaskRunning(false);
      }
    }
  };

  const stopTask = async () => {
    if (isTaskRunning) {
      console.log('Stopping background task');
      try {
        await BackgroundService.stop();
        setIsTaskRunning(false);
        await AsyncStorage.setItem('isBackgroundTaskStarted', 'false');
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      } catch (error) {
        console.error('Error stopping background task:', error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e272e" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Icon name="shield-check" size={30} color="#ffffff" />
          <Text style={styles.title}>SMS Guard</Text>
        </View>

        {incomingCallNumber ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="phone" size={24} color="#2c3e50" />
              <Text style={styles.cardTitle}>Incoming Call</Text>
            </View>
            <Text style={styles.smsSender}>
              From: {incomingCallNumber} {isIncomingCallScammer && '(Scammer)'}
            </Text>
          </View>
        ) : null}

        {latestSms ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="message-text" size={24} color="#2c3e50" />
              <Text style={styles.cardTitle}>Latest SMS</Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                scammerStatus.isScammer && fetchScamMessages(smsSender)
              }>
              <Text
                style={[
                  styles.smsSender,
                  scammerStatus.isScammer && styles.scammer,
                ]}>
                From: {smsSender}
              </Text>
            </TouchableOpacity>
            <Text style={styles.smsBody}>{latestSms}</Text>
          </View>
        ) : null}

        {predictedResult ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="chart-bubble" size={24} color="#2c3e50" />
              <Text style={styles.cardTitle}>AI Prediction</Text>
            </View>
            <Text
              style={[
                styles.predictionResult,
                predictedResult.toLowerCase() === 'scam' && styles.scamResult,
              ]}>
              {predictedResult}
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="timer" size={24} color="#2c3e50" />
            <Text style={styles.cardTitle}>Next Check</Text>
          </View>
          <Text style={styles.timerText}>{timer} seconds</Text>
        </View>

        <TouchableOpacity
          style={[styles.startButton, isTaskRunning && styles.stopButton]}
          onPress={isTaskRunning ? stopTask : startTask}>
          <Text style={styles.buttonText}>
            {isTaskRunning ? 'Stop Background Task' : 'Start Background Task'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scam History</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#2c3e50" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {scamMessages.map((message, index) => (
                <View key={index} style={styles.modalMessageContainer}>
                  <Text style={styles.modalMessageNumber}>
                    {message.scam_no}
                  </Text>
                  <Text style={styles.modalMessage}>{message.scam_mes}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e272e',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 10,
  },
  smsSender: {
    fontSize: 16,
    marginBottom: 10,
    color: '#34495e',
  },
  scammer: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  smsBody: {
    fontSize: 16,
    color: '#34495e',
  },
  predictionResult: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  scamResult: {
    color: '#e74c3c',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  startButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: width * 0.8,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalMessageContainer: {
    marginBottom: 10,
  },
  modalMessageNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
  },
  modalMessage: {
    fontSize: 16,
    color: '#34495e',
  },
});

export default Sms;
