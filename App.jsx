// App.js
import React, {useEffect, useState} from 'react';
import {Button, View, Alert, StyleSheet, Text} from 'react-native';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import TrackPlayer from 'react-native-track-player';
import CallRecorderModule from './CallRecorderModule';

const audioRecorderPlayer = new AudioRecorderPlayer();

const App = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [lastRecordingPath, setLastRecordingPath] = useState(null);

  useEffect(() => {
    checkPermissions();
    setupCallRecorder();
    setupTrackPlayer();
    return () => {
      CallRecorderModule.stopListening();
    };
  }, []);

  const checkPermissions = async () => {
    const permissions = [
      PERMISSIONS.ANDROID.RECORD_AUDIO,
      PERMISSIONS.ANDROID.READ_PHONE_STATE,
      PERMISSIONS.ANDROID.READ_CALL_LOG,
    ];

    for (const permission of permissions) {
      const result = await check(permission);
      if (result !== RESULTS.GRANTED) {
        const permissionResult = await request(permission);
        if (permissionResult !== RESULTS.GRANTED) {
          Alert.alert(
            'Permission required',
            `${permission} is required for this app to work.`,
          );
        }
      }
    }
  };

  const setupTrackPlayer = async () => {
    await TrackPlayer.setupPlayer();
  };

  const setupCallRecorder = () => {
    CallRecorderModule.startListening(event => {
      console.log('Phone state changed:', event);
      if (event.state === 'OFFHOOK') {
        startRecording();
      } else if (event.state === 'IDLE') {
        stopRecording();
      }
    });
  };

  const startRecording = async () => {
    try {
      const result = await audioRecorderPlayer.startRecorder();
      setIsRecording(true);
      console.log('Recording started', result);
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      setIsRecording(false);
      setLastRecordingPath(result);
      console.log('Recording stopped', result);
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  };

  const playRecording = async () => {
    if (!lastRecordingPath) {
      Alert.alert('No recording', 'There is no recording to play.');
      return;
    }

    try {
      await TrackPlayer.reset();
      await TrackPlayer.add({
        url: lastRecordingPath,
        title: 'Recorded Call',
      });
      await TrackPlayer.play();
    } catch (error) {
      console.error('Failed to play recording', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>
        {isRecording ? 'Recording in progress...' : 'Not recording'}
      </Text>
      <Button
        title="Play Last Recording"
        onPress={playRecording}
        disabled={isRecording || !lastRecordingPath}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    marginBottom: 20,
  },
});

export default App;
