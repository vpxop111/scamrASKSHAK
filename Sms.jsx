import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  BackHandler,
  AppState,
  StatusBar,
  PermissionsAndroid,
  FlatList,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import BackgroundService from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';
import {supabase} from './supabase'; // Import your Supabase client instance
import {useTask} from './TaskContext'; // Import useTask from TaskContext
import {AuthContext} from './AuthContext';

const Sms = () => {
  const {user, signOut} = useContext(AuthContext); // Use AuthContext to get user and signOut
  const {taskStarted, startTask, stopTask} = useTask(); // Use TaskContext
  const [latestSms, setLatestSms] = useState('');
  const [smsSender, setSmsSender] = useState('');
  const [predictedResult, setPredictedResult] = useState('');
  const [apiStatus, setApiStatus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isTaskRunning, setIsTaskRunning] = useState(taskStarted); // Sync with context
  const [lastProcessedSmsId, setLastProcessedSmsId] = useState(null);
  const [countdown, setCountdown] = useState(20); // Initial countdown value (in seconds)
  const [scamMessages, setScamMessages] = useState([]);

  useEffect(() => {
    if (user) {
      console.log('User email:', user.email);
      console.log('User UID:', user.uid);
    } else {
      navigation.navigate('Login'); // Redirect to Login if no user
    }
  }, [user]);

  useEffect(() => {
    requestReadSmsPermission();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );
    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    let timer;
    if (isTaskRunning && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prevCount => prevCount - 1);
      }, 1000);
    } else if (countdown === 0) {
      readLatestSMS(); // Fetch the latest SMS on countdown reaching zero
      setCountdown(20); // Reset the countdown for the next cycle
    }

    return () => {
      backHandler.remove();
      appStateSubscription.remove();
      clearInterval(timer); // Clear the interval on component unmount
    };
  }, [isTaskRunning, countdown]);

  const fetchScamMessages = async () => {
    try {
      const {data, error} = await supabase
        .from('scamsms')
        .select('*')
        .eq('sid', user.email);

      if (error) {
        console.error('Error fetching scam messages:', error);
      } else {
        setScamMessages(data);
      }
    } catch (error) {
      console.error('Error fetching scam messages:', error);
    }
  };

  useEffect(() => {
    fetchScamMessages();

    const intervalId = setInterval(() => {
      fetchScamMessages();
    }, 20000); // Fetch every 5 minutes

    return () => clearInterval(intervalId);
  }, [user.email]);

  const onBackPress = () => {
    if (isTaskRunning) {
      Alert.alert(
        'Background Task Running',
        'The background task is still running. Do you want to stop it and exit?',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Stop and Exit',
            onPress: async () => {
              await stopTask();
              BackHandler.exitApp();
            },
          },
        ],
      );
      return true;
    }
    return false;
  };

  const handleAppStateChange = nextAppState => {
    if (nextAppState === 'background' && isTaskRunning) {
      console.log('App is in background, background task continues running');
    }
  };

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
        console.log('SMS permission granted');
      } else {
        console.log('SMS permission denied');
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
            setLastProcessedSmsId(messageId);
            setLatestSms(latestMessage);
            setSmsSender(sender);
            sendMessageToApi({message: latestMessage, sender});
          }
        }
      },
    );
  };

  const storeScamMessageInScamsms = async (phoneNumber, message) => {
    try {
      if (typeof phoneNumber !== 'string') {
        console.error('Invalid phone number type');
        return;
      }
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

      const {data, error} = await supabase.from('scamsms').insert([
        {scam_no: cleanPhoneNumber, scam_mes: message, sid: user.email}, // Use user.email directly
      ]);

      if (error) {
        if (error.code === '23505') {
          // Duplicate entry detected
          console.log('Scam message already exists in the database.');
        } else {
          throw error;
        }
      } else {
        console.log('Scam message successfully stored in scamsms.');
      }
    } catch (error) {
      console.error('Error storing scam message in scamsms: ', error);
    }
  };

  const storeScamMessage = async (phoneNumber, message) => {
    try {
      if (!user || !user.email) {
        console.error('User email not found');
        return;
      }

      if (typeof phoneNumber !== 'string') {
        console.error('Invalid phone number type');
        return;
      }

      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

      const {data, error} = await supabase
        .from('scammers') // Adjust table name if necessary
        .insert([
          {scam_no: cleanPhoneNumber, scam_mes: message, sid: user.email}, // Use user.email directly
        ]);

      if (error) {
        if (error.code === '23505') {
          console.log('Scam message already exists in the database.');
        } else {
          throw error;
        }
      } else {
        console.log('Scam message successfully stored in scammers.');
      }
    } catch (error) {
      console.error('Error storing scam message in scammers: ', error);
    }
  };

  const deleteScamMessage = async id => {
    try {
      // Delete the row from the 'scamsms' table where the ID matches
      const {error} = await supabase.from('scamsms').delete().eq('id', id);

      if (error) {
        throw error; // Throw error if something went wrong
      } else {
        console.log('Scam message successfully deleted from scamsms.');
        showNotification(
          'Message Deleted',
          'The scam message has been removed.',
        );
        // Refresh the list after deletion
        fetchScamMessages();
      }
    } catch (error) {
      console.error('Error deleting scam message:', error);
    }
  };

  const sendMessageToApi = async ({message, sender}) => {
    setProcessing(true);
    try {
      const response = await fetch(
        'https://varun324242-sssssss.hf.space/predict', // Ensure this API endpoint is correct
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({message, sender}),
        },
      );

      if (!response.ok) {
        console.error('Network error:', await response.text());
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      console.log('API Response:', result);
      setPredictedResult(result.predicted_result);
      setApiStatus('Success');

      if (result.predicted_result.toLowerCase() === 'scam') {
        await storeScamMessage(sender, message); // Store in scammers table
        await storeScamMessageInScamsms(sender, message); // Store in scamsms table

        showNotification(
          'Scam Alert',
          `Message from ${sender} is detected as scam.`,
        );
      } else {
        showNotification(
          'Legitimate Message',
          `Message from ${sender} is detected as legitimate.`,
        );
      }
    } catch (error) {
      console.error('Error sending message to API:', error);
      setApiStatus('Error');
    } finally {
      setProcessing(false);
    }
  };

  const showNotification = (title, message) => {
    PushNotification.localNotification({
      channelId: 'default-channel-id', // Ensure channelId is correct or defined elsewhere
      title,
      message,
    });
  };

  const onStartTaskPress = async () => {
    await startTask();
    setIsTaskRunning(true);
    showNotification(
      'Background Task Started',
      'The background task for SMS detection has started.',
    );
  };

  const onStopTaskPress = async () => {
    await stopTask();
    setIsTaskRunning(false);
    showNotification(
      'Background Task Stopped',
      'The background task for SMS detection has been stopped.',
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerText}>Scam Message Detection</Text>
      </View>
      <ScrollView>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.button}
            onPress={isTaskRunning ? onStopTaskPress : onStartTaskPress}>
            <Text style={styles.buttonText}>
              {isTaskRunning ? 'Stop Background Task' : 'Start Background Task'}
            </Text>
          </TouchableOpacity>

          <FlatList
            data={scamMessages}
            keyExtractor={item => item.id.toString()}
            renderItem={({item}) => (
              <View style={styles.messageContainer}>
                <Text>From: {item.scam_no}</Text>
                <Text>Message: {item.scam_mes}</Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteScamMessage(item.id)}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          {processing && <Text>Processing...</Text>}
          <Text>Latest SMS: {latestSms}</Text>
          <Text>Sender: {smsSender}</Text>
          <Text>Prediction: {predictedResult}</Text>
          <Text>API Status: {apiStatus}</Text>
        </View>
      </ScrollView>
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
  button: {
    padding: 16,
    backgroundColor: '#007bff',
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  messageContainer: {
    padding: 16,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    marginBottom: 8,
  },
  deleteButton: {
    marginTop: 8,
    backgroundColor: '#ff4d4d',
    padding: 8,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#ffffff',
    textAlign: 'center',
  },
});

export default Sms;
