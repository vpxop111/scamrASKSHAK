import React, {useState, useEffect} from 'react';
import {View, Alert, TouchableOpacity, Text, StyleSheet} from 'react-native';
import {supabase} from '../supabase';
import Gmail1 from '../Gmail1';

export default function App({navigation}) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);

  async function signInWithEmail() {
    setLoading(true);
    const {error} = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      const {
        data: {session},
        error,
      } = await supabase.auth.getSession();
      if (error) Alert.alert(error.message);
      setSession(session);
      setLoading(false);
    };

    getSession();

    const {data: authListener} = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return loading ? (
    <View style={styles.centered}>
      <Gmail1 />
    </View>
  ) : session && session.user ? (
    <></> // Your logged-in UI goes here
  ) : (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>ScamSafe</Text>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.loginButton}
          activeOpacity={0.7}
          onPress={() => {
            navigation.navigate('Login');
          }}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.signupButton}
          activeOpacity={0.7}
          onPress={() => {
            navigation.navigate('Signup');
          }}>
          <Text style={styles.signupButtonText}>Signup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 60,
    marginTop: 10,
  },
  headerText: {
    color: '#0029FF',
    fontSize: 40,
    fontWeight: 'bold',
  },
  buttonContainer: {
    position: 'absolute',
    paddingTop: 50,
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20, // Add some padding to keep the buttons away from the edges
  },
  loginButton: {
    padding: 16,
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#0029FF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  loginButtonText: {
    color: '#0029FF',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  signupButton: {
    padding: 16,
    backgroundColor: '#0029FF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  signupButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
