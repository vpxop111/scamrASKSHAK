import React, {useState, useEffect} from 'react';
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {supabase} from '../supabase';
import Gmail1 from '../Gmail1';

export default function Login({navigation}) {
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (session && session.user) {
    return <Gmail1 />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.welcomeText}>Welcome</Text>
          <View style={styles.row}>
            <Text style={styles.backText}>Back</Text>
            <Text style={styles.exclamationText}>!</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={loginEmail}
              onChangeText={text => setLoginEmail(text)}
            />
          </View>
          <View style={[styles.inputContainer, styles.passwordContainer]}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={loginPassword}
              onChangeText={text => setLoginPassword(text)}
            />
          </View>
          <Text
            style={styles.forgotPasswordText}
            onPress={() => navigation.navigate('forgot')}>
            Forgot Password?
          </Text>
          <View style={styles.loginButtonContainer}>
            <TouchableOpacity
              style={styles.loginButton}
              activeOpacity={0.7}
              onPress={signInWithEmail}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    backgroundColor: 'white',
    height: '100%',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  textContainer: {
    marginLeft: 8,
  },
  welcomeText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#0029FF',
  },
  row: {
    flexDirection: 'row',
    marginTop: 2,
  },
  backText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'black',
  },
  exclamationText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#0029FF',
  },
  inputContainer: {
    width: '100%',
    height: 60,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'black',
    marginTop: 10,
    justifyContent: 'center',
  },
  passwordContainer: {
    marginTop: 8,
  },
  input: {
    marginHorizontal: 20,
    fontSize: 18,
  },
  forgotPasswordText: {
    fontSize: 18,
    color: '#0029FF',
    marginTop: 12,
    marginLeft: 'auto',
    marginRight: 20,
    fontWeight: 'bold',
  },
  loginButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  loginButton: {
    paddingVertical: 16,
    backgroundColor: '#0029FF',
    borderRadius: 50,
    width: 240,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
});
