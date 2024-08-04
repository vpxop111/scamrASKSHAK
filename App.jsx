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
  useEffect(() => {
    requestReadSmsPermission();
  }, []);

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.title}>SMS Scam Detector</Text>
          {latestSms ? (
            <View style={styles.smsContainer}>
              <Text style={styles.smsTitle}>Latest SMS from:</Text>
              <View style={styles.senderContainer}>
                <Text style={styles.smsSender}>
                  {smsSender.replace(/ \(Scammer\)$/, '')}
                </Text>
                {scammerStatus.isScammer && (
                  <Text style={styles.scammerLabel}> (Scammer)</Text>
                )}
              </View>
              <Text style={styles.smsTitle}>Latest SMS:</Text>
              <Text style={styles.smsBody}>{latestSms}</Text>
            </View>
          ) : null}
          {predictedResult ? (
            <View style={styles.responseContainer}>
              <Text style={styles.responseTitle}>API Response:</Text>
              <Text style={styles.responseBody}>{predictedResult}</Text>
            </View>
          ) : null}
          <View style={styles.timerContainer}>
            <Text style={styles.timerTitle}>Next check in:</Text>
            <Text style={styles.timerBody}>{timer} seconds</Text>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => fetchScamMessages(smsSender)}>
            <Text style={styles.buttonText}>View Scam History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Scam History</Text>
            {scamMessages.map((msg, index) => (
              <View key={index} style={styles.scamMessageContainer}>
                <Text style={styles.scamMessageNumber}>{msg.scam_no}</Text>
                <Text style={styles.scamMessageText}>{msg.scam_mes}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  smsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  smsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555',
  },
  senderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smsSender: {
    fontSize: 18,
    marginBottom: 10,
    color: '#333',
  },
  scammerLabel: {
    fontSize: 18,
    marginBottom: 10,
    color: 'red',
    fontWeight: 'bold',
  },
  smsBody: {
    fontSize: 16,
    color: '#444',
  },
  responseContainer: {
    backgroundColor: '#e6f7ff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  responseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#0066cc',
  },
  responseBody: {
    fontSize: 18,
    color: '#333',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerTitle: {
    fontSize: 16,
    marginRight: 10,
    color: '#555',
  },
  timerBody: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  scamMessageContainer: {
    marginBottom: 10,
    width: '100%',
  },
  scamMessageNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  scamMessageText: {
    fontSize: 14,
    color: '#444',
  },
  closeButton: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 15,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default App;
