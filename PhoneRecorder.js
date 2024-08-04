import { NativeModules } from 'react-native';

const { PhoneRecorder } = NativeModules;

export default {
  startRecording: () => {
    return PhoneRecorder.startRecording();
  },
  stopRecording: () => {
    return PhoneRecorder.stopRecording();
  },
};