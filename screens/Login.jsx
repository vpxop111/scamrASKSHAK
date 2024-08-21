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
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (session && session.user) {
    return <Gmail1 />;
  }

  return (
    <View className="bg-black h-full">
      <View className="flex flex-col mt-20 bg-black">
        <View className="flex flex-col ml-8">
          <Text className="text-5xl font-bold text-[#ddff00]">Welcome</Text>
          <View className="flex flex-row mt-2">
            <Text className="text-5xl font-bold text-white">Back</Text>
            <Text className="text-5xl font-bold text-[#ddff00]">!</Text>
          </View>
          <View className="w-[1rem] mr-10 h-20 rounded-full border-4 border-[#ddff00] mt-10">
            <TextInput
              className="mt-3 mx-5 text-lg text-white"
              placeholder="Email"
              placeholderTextColor="#ffffff" // Set placeholder text color to white
              value={loginEmail}
              onChangeText={text => setLoginEmail(text)}
              style={{color: '#ffffff'}} // Set user input text color to white
            />
          </View>
          <View className="w-[1rem] mr-10 h-20 rounded-full border-4 border-[#ddff00] mt-10">
            <TextInput
              className="mt-3 mx-5 text-lg text-white"
              placeholder="Password"
              placeholderTextColor="#ffffff" // Set placeholder text color to white
              secureTextEntry
              value={loginPassword}
              onChangeText={text => setLoginPassword(text)}
              style={{color: '#ffffff'}} // Set user input text color to white
            />
          </View>
          <Text
            className="text-lg mt-3 ml-40 pl-11 font-bold text-[#ddff00]"
            onPress={() => navigation.navigate('forgot')}>
            Forgot Password?
          </Text>
          <View className="flex flex-row justify-center mt-20 mr-8">
            <TouchableOpacity
              className="p-5  rounded-full shadow-lg w-60 bg-[#ddff00]"
              activeOpacity={0.7}
              onPress={() => {
                navigation.navigate('Home');
              }}>
              <Text className="text-black text-center text-2xl font-bold">
                Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
