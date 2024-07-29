import React, {useState, useEffect, useRef} from 'react';
import {
  PermissionsAndroid,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import {supabase} from './supabase';

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
      const {data, error} = await supabase.from('scammers').select('scam_no');

      if (error) {
        console.error('Error fetching scam numbers:', error.message);
        return false;
      }

      if (!data || data.length === 0) {
        console.log('No scam numbers found in the database');
        return false;
      }

      const normalizedSender = cleanSender.replace(/\D/g, '');
      const scamNumbers = data.map(item =>
        String(item.scam_no).replace(/\D/g, ''),
      );

      const isScammer = scamNumbers.some(
        number =>
          normalizedSender.endsWith(number) ||
          number.endsWith(normalizedSender),
      );

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
          // Unique constraint violation
          console.log('Scammer already exists in the database.');
          // You might want to update the existing record here
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

  useEffect(() => {
    if (!processing && latestSms && !isChecking) {
      sendMessageToApi(latestSms);
    }
  }, [processing, latestSms, isChecking]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>SMS Reader</Text>
      {latestSms ? (
        <View style={styles.smsContainer}>
          <Text style={styles.smsTitle}>Latest SMS from:</Text>
          <Text
            style={[
              styles.smsSender,
              scammerStatus.isScammer && styles.scammer,
            ]}>
            {smsSender}
          </Text>
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
        <Text style={styles.timerTitle}>Timer:</Text>
        <Text style={styles.timerBody}>{timer}</Text>
      </View>
      <View style={styles.apiStatusContainer}>
        <Text style={styles.apiStatusTitle}>API Status:</Text>
        <Text style={styles.apiStatusBody}>{apiStatus}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  smsContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  smsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  smsSender: {
    fontSize: 16,
    marginBottom: 10,
  },
  scammer: {
    color: 'red',
    fontWeight: 'bold',
  },
  smsBody: {
    fontSize: 16,
  },
  responseContainer: {
    backgroundColor: '#e6f7ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  responseBody: {
    fontSize: 16,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerBody: {
    fontSize: 18,
  },
  apiStatusContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
  },
  apiStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  apiStatusBody: {
    fontSize: 14,
  },
});

export default App;
