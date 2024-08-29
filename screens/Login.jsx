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
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={{backgroundColor: 'black', height: '100%'}}>
      <View style={{marginTop: 80, marginLeft: 32}}>
        <Text style={{fontSize: 40, fontWeight: 'bold', color: '#ddff00'}}>
          Welcome
        </Text>
        <View style={{flexDirection: 'row', marginTop: 8}}>
          <Text style={{fontSize: 40, fontWeight: 'bold', color: 'white'}}>
            Back
          </Text>
          <Text style={{fontSize: 40, fontWeight: 'bold', color: '#ddff00'}}>
            !
          </Text>
        </View>
        <TouchableOpacity
          style={{
            padding: 16,
            borderRadius: 50,
            shadowColor: 'black',
            shadowOpacity: 0.25,
            shadowRadius: 4,
            shadowOffset: {width: 0, height: 2},
            backgroundColor: '#ddff00',
            width: 240,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 40,
          }}
          activeOpacity={0.7}
          onPress={handleGoogleSignIn}>
          <Text style={{color: 'black', fontSize: 24, fontWeight: 'bold'}}>
            Login with Google
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
