import React, {useContext, useEffect} from 'react';
import {
  Alert,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {AuthContext} from '../AuthContext'; // Ensure this path is correct
import Home from './Home';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';

export default function Login({navigation}) {
  const {signIn, user, isSigninInProgress} = useContext(AuthContext);

  useEffect(() => {
    // Request permissions when the component mounts
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        // Request Phone permission
        const grantedPhone = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CALL_PHONE,
          {
            title: 'Phone Permission',
            message: 'This app needs access to your phone to detect calls.',
            buttonPositive: 'OK',
          },
        );

        // Request SMS permission
        const grantedSMS = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
          {
            title: 'SMS Permission',
            message: 'This app needs access to your SMS messages.',
            buttonPositive: 'OK',
          },
        );

        // Request Notification permission
        const notificationPermission = await request(
          PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
        );

        if (
          grantedPhone !== PermissionsAndroid.RESULTS.GRANTED ||
          grantedSMS !== PermissionsAndroid.RESULTS.GRANTED ||
          notificationPermission !== RESULTS.GRANTED
        ) {
          Alert.alert(
            'Permissions Required',
            'You need to grant all permissions for the app to work properly.',
          );
        }
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      Alert.alert('Login Error', error.message);
    }
  };

  // Redirect to Home if user is already logged in
  if (user) {
    return <Home />;
  }

  if (isSigninInProgress) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View className="bg-black h-full">
      <View className="mt-20 ml-8">
        <Text className="text-5xl font-bold text-[#ddff00]">Welcome</Text>
        <View className="flex-row mt-2">
          <Text className="text-5xl font-bold text-white">Back</Text>
          <Text className="text-5xl font-bold text-[#ddff00]">!</Text>
        </View>
        <TouchableOpacity
          className="mt-10 p-4 rounded-full bg-[#ddff00] w-60 shadow-md shadow-black items-center justify-center active:opacity-70"
          onPress={handleGoogleSignIn}>
          <Text className="text-black text-2xl font-bold">
            Login with Google
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
