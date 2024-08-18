import React, {useState} from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  StyleSheet,
} from 'react-native';
import {supabase} from '../supabase';

export default function Signup({navigation}) {
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (registerPassword !== confirmPassword) {
      Alert.alert('Passwords do not match');
      return;
    }

    setLoading(true);
    const {error} = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
    });

    if (error) {
      Alert.alert(error.message);
    } else {
      Alert.alert('Please check your inbox for email verification!');
      navigation.navigate('home');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.blueText}>Create</Text>
          <Text style={styles.blackText}>an</Text>
        </View>
        <Text style={styles.blackTextSecond}>account</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={registerEmail}
            onChangeText={text => setRegisterEmail(text)}
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={registerPassword}
            onChangeText={text => setRegisterPassword(text)}
          />
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={text => setConfirmPassword(text)}
          />
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.7}
            onPress={register}
            disabled={loading}>
            <Text style={styles.buttonText}>Signup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    height: '100%',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    paddingLeft: 8,
    gap: 10,
  },
  blueText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#0029FF',
  },
  blackText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'black',
  },
  blackTextSecond: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'black',
    marginLeft: 8,
    marginTop: 8,
  },
  inputContainer: {
    width: '100%',
    height: 60,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'black',
    marginTop: 10,
    justifyContent: 'center',
    paddingLeft: 20,
  },
  input: {
    fontSize: 18,
  },
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  button: {
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
  buttonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
});
