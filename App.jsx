import React, {useState, useEffect, useRef} from 'react';
import {
  PermissionsAndroid,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import {supabase} from './supabase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CallDetectorManager from 'react-native-call-detection';

const {width} = Dimensions.get('window');

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

const App = () => {
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
  const timerRef = useRef(null);
  const scammerCacheRef = useRef({});

  useEffect(() => {
    const initializeApp = async () => {
      await requestReadSmsPermission();
      startTimer();
    };

    initializeApp();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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
  const fetchCallScamDetails = async phoneNumber => {
    try {
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      const {data, error} = await supabase
        .from('scammers')
        .select('scam_no, scam_mes')
        .eq('scam_no', cleanPhoneNumber);

      if (error) {
        console.error('Error fetching call scam details:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchCallScamDetails:', error);
      return null;
    }
  };
  useEffect(() => {
    let callDetector;

    const setupCallDetector = async () => {
      try {
        callDetector = new CallDetectorManager(
          async (event, number) => {
            if (event === 'Incoming') {
              console.log('Incoming call from:', number);
              const scamDetails = await fetchCallScamDetails(number);
              if (scamDetails && scamDetails.length > 0) {
                console.log('Scammer detected:', number);
                Alert.alert(
                  'Scam Call Detected',
                  `Number: ${scamDetails[0].scam_no}\nMessage: ${scamDetails[0].scam_mes}`,
                  [{text: 'OK', onPress: () => console.log('Alert closed')}],
                  {cancelable: false},
                );
              } else {
                Alert.alert(
                  'Incoming Call',
                  `Incoming call from: ${number}`,
                  [{text: 'OK', onPress: () => console.log('Alert closed')}],
                  {cancelable: false},
                );
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

        {/* Existing SMS and Prediction Display Code */}
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
      </ScrollView>
    </SafeAreaView>
  );
};
import {StyleSheet} from 'react-native';

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
  apiStatusText: {
    fontSize: 16,
    color: '#34495e',
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

export default App;
