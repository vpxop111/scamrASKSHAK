import React, {useState, useEffect} from 'react';
import {
  View,
  Alert,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import {supabase} from '../supabase';
import Gmail1 from '../Gmail1';

export default function Welcome({navigation}) {
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
    <View className="flex">
      <View className="flex flex-col h-full bg-black">
        <View className="flex flex-row justify-center pt-60 mt-20">
          <View className="flex flex-row items-center">
            <Text className="text-5xl font-semibold text-[#ddff00]">S</Text>
            <Text className="text-3xl font-semibold text-white">cam</Text>
            <Text className="text-3xl font-semibold text-white">Rakshak</Text>
          </View>
        </View>
        <View className="flex flex-row gap-12 justify-center mt-60">
          <TouchableOpacity
            className="p-5 bg-black border-4 border-[#ddff00] rounded-xl shadow-lg"
            activeOpacity={0.7}
            onPress={() => {
              navigation.navigate('Login');
            }}>
            <Text className="text-white text-center text-2xl font-bold">
              Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="p-5 bg-[#0029FF] rounded-xl shadow-lg"
            activeOpacity={0.7}
            onPress={() => {
              navigation.navigate('Signup');
            }}>
            <Text className="text-white text-center text-2xl font-bold">
              Signup
            </Text>
          </TouchableOpacity>
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
