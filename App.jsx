import React, {useState, useEffect, useRef} from 'react';
import {PermissionsAndroid, ScrollView, Text, View} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import {supabase} from './supabase'; // Import Supabase client

const App = () => {
  const [latestSms, setLatestSms] = useState('');
  const [smsSender, setSmsSender] = useState('');
  const [predictedResult, setPredictedResult] = useState('');
  const [timer, setTimer] = useState(20);
  const [apiStatus, setApiStatus] = useState('');
  const [scamNumbers, setScamNumbers] = useState([]);
  const [isScammer, setIsScammer] = useState(false);
  const timerRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastProcessedSmsId, setLastProcessedSmsId] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      await requestReadSmsPermission();
      await fetchScamNumbers();
      startTimer();
    };

    initializeApp();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
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

  const fetchScamNumbers = async () => {
    try {
      const {data, error} = await supabase.from('scammers').select('scam_no');
      console.log('Supabase Response:', data, error);

      if (error) {
        console.error('Error fetching scam numbers:', error.message);
        return;
      }

      const scamNumbers = data.map(item => item.scam_no);
      console.log('Fetched scam numbers:', scamNumbers);
      setScamNumbers(scamNumbers);
    } catch (error) {
      console.error('Error fetching scam numbers:', error.message);
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
            setSmsSender(sender); // Set sender here
            setLastProcessedSmsId(messageId);
            checkIfScammer(sender); // Check after setting sender
          }
        }
      },
    );
  };

  const checkIfScammer = sender => {
    console.log('Current scamNumbers:', scamNumbers); // Log current scam numbers
    const isScammer = scamNumbers.includes(sender);
    setIsScammer(isScammer);
    setSmsSender(isScammer ? `${sender} (Scammer)` : sender);
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
        storeScamMessage(smsSender, latestSms);
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

      const {data, error: insertError} = await supabase
        .from('scammers')
        .insert([{scam_no: phoneNumber, scam_mes: message}]);

      if (insertError) {
        if (
          insertError.message.includes(
            'duplicate key value violates unique constraint',
          )
        ) {
          console.log('Duplicate entry detected, no action needed.');
        } else {
          throw insertError;
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
          <Text style={[styles.smsSender, isScammer && styles.scammer]}>
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
import {StyleSheet} from 'react-native';

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
