import React, {useState, useEffect, useRef} from 'react';
import {StyleSheet, Text, View, PermissionsAndroid} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';

const App = () => {
  const [latestSms, setLatestSms] = useState('');
  const [predictedResult, setPredictedResult] = useState('');
  const [timer, setTimer] = useState(20);
  const timerRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    requestReadSmsPermission();
    startTimer();
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
          setLatestSms(latestMessage);
        }
      },
    );
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
          return 20; // Reset timer for the next cycle
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
    } catch (error) {
      console.error('Error sending message to API: ', error);
      setPredictedResult('Error sending message to API');
    } finally {
      setProcessing(false);
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!processing && latestSms && !isChecking) {
      sendMessageToApi(latestSms);
    }
  }, [processing, latestSms, isChecking]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SMS Reader</Text>
      {latestSms ? (
        <View style={styles.smsContainer}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  smsContainer: {
    marginTop: 20,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  smsTitle: {
    fontWeight: 'bold',
  },
  smsBody: {
    marginTop: 5,
    fontSize: 18,
  },
  responseContainer: {
    marginTop: 20,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  responseTitle: {
    fontWeight: 'bold',
  },
  responseBody: {
    marginTop: 5,
    fontSize: 18,
    fontFamily: 'Courier New',
    color: 'gray',
  },
  timerContainer: {
    marginTop: 20,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  timerTitle: {
    fontWeight: 'bold',
  },
  timerBody: {
    marginTop: 5,
    fontSize: 18,
    color: 'red',
  },
});

export default App;
