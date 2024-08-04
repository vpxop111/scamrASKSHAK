import React, {useState, useEffect} from 'react';
import {View, Text, Button} from 'react-native';
import RNCallKeep from 'react-native-callkeep';
import Voice from '@react-native-voice/voice';

const App = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');

  useEffect(() => {
    // Set up CallKeep
    RNCallKeep.setup({
      ios: {
        appName: 'My App',
      },
      android: {
        alertTitle: 'Permissions required',
        alertDescription:
          'This application needs to access your phone accounts',
        cancelButton: 'Cancel',
        okButton: 'ok',
      },
    });

    // Set up event listeners for CallKeep
    RNCallKeep.addEventListener('didReceiveStartCallAction', handleStartCall);
    RNCallKeep.addEventListener('endCall', handleEndCall);

    // Set up Voice event listeners
    Voice.onSpeechResults = onSpeechResults;

    return () => {
      // Clean up listeners
      RNCallKeep.removeEventListener(
        'didReceiveStartCallAction',
        handleStartCall,
      );
      RNCallKeep.removeEventListener('endCall', handleEndCall);
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const handleStartCall = () => {
    setIsCallActive(true);
    startVoiceRecognition();
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    stopVoiceRecognition();
  };

  const startVoiceRecognition = async () => {
    try {
      await Voice.start('en-US');
    } catch (e) {
      console.error(e);
    }
  };

  const stopVoiceRecognition = async () => {
    try {
      await Voice.stop();
    } catch (e) {
      console.error(e);
    }
  };

  const onSpeechResults = e => {
    setRecognizedText(e.value[0]);
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text>Call Active: {isCallActive ? 'Yes' : 'No'}</Text>
      <Text>Recognized Text: {recognizedText}</Text>
      <Button
        title={isCallActive ? 'End Call' : 'Start Call'}
        onPress={() => {
          if (isCallActive) {
            RNCallKeep.endAllCalls();
          } else {
            RNCallKeep.startCall('12345', '555-1234', 'John Doe');
          }
        }}
      />
    </View>
  );
};

export default App;
