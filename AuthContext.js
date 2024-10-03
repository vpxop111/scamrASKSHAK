import React, {createContext, useState, useEffect} from 'react';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {Alert} from 'react-native';

// Create the AuthContext
export const AuthContext = createContext();

const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [isSigninInProgress, setIsSigninInProgress] = useState(false);

  // Configure Google Sign-In
  const configureGoogleSignin = async () => {
    try {
      await GoogleSignin.configure({
        webClientId:
          '483287191355-lr9eqf88sahgfsg63eaoq1p37dp89rh3.apps.googleusercontent.com',
        androidClientId:
          '483287191355-29itib6r943rprhcruog9s3aifengdmc.apps.googleusercontent.com',
        scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      });
      console.log('GoogleSignin configured successfully');
    } catch (error) {
      console.error('Error configuring Google Sign-In:', error);
    }
  };

  useEffect(() => {
    configureGoogleSignin();
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      if (userInfo) {
        setUser(userInfo.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  // Sign-In Function
  const signIn = async () => {
    if (isSigninInProgress) return;

    setIsSigninInProgress(true);
    try {
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      const userInfo = await GoogleSignin.signIn();
      setUser(userInfo.user);
    } catch (error) {
      console.error('Sign-In Error:', error); // Log the full error object
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Sign-In Cancelled', 'User cancelled the sign-in process.');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Sign-In In Progress', 'Sign-in is already in progress.');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          'Play Services Not Available',
          'Play services are not available.',
        );
      } else {
        Alert.alert(
          'Sign-In Error',
          'An error occurred during sign-in. Please try again.',
        );
      }
    } finally {
      setIsSigninInProgress(false);
    }
  };

  // Sign-Out Function
  const signOut = async () => {
    setIsSigninInProgress(true);
    try {
      await GoogleSignin.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign-Out Error:', error);
    } finally {
      setIsSigninInProgress(false);
    }
  };

  // Check if user is logged in
  const isLoggedIn = () => {
    return !!user;
  };

  return (
    <AuthContext.Provider
      value={{user, signIn, signOut, isSigninInProgress, isLoggedIn}}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;