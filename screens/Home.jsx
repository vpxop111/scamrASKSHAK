import React, {useEffect, useState} from 'react';
import {Button, Text, View, StyleSheet} from 'react-native';
import {auth} from '../firebase'; // Import your Firebase configuration or auth object
import {useAuthState} from 'react-firebase-hooks/auth'; // Import useAuthState
import {supabase} from '../supabase';
import {useNavigation, useRoute} from '@react-navigation/native';

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users] = useAuthState(auth);
  const navigation = useNavigation();
  const route = useRoute();
  const {paramName} = route.params || {}; // Handle cases where params might be undefined

  useEffect(() => {
    // Check if there's a user signed in
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUser(user);
        console.log('User email:', user.email);
        console.log('User UID:', user.uid);
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      const {error} = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      // Redirect to the login screen or perform any other action after logout
      navigation.navigate('Login');
    } catch (error) {
      console.error('Logout error:', error.message);
      // Handle logout error, if any
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.blueText}>S</Text>
            <Text style={styles.blackText}>cam</Text>
            <Text style={styles.blueText}>S</Text>
            <Text style={styles.blackText}>afe</Text>
          </View>
          <Text style={styles.notiText}>Noti</Text>
        </View>
        <Button onPress={handleLogout} title="Logout" />
        <Button onPress={() => navigation.navigate('scams')} title="Scam" />
        <Button onPress={() => navigation.navigate('scamai')} title="Scamai" />
        <Button onPress={() => navigation.navigate('news')} title="Scamnews" />
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
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginLeft: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blueText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0029FF',
  },
  blackText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  notiText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 80,
    paddingLeft: 80,
  },
});
