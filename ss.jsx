import React, {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import CallDetectorManager from 'react-native-call-detection';
import supabase from './supabase'; // Import Supabase client

const App = () => {
  useEffect(() => {
    // Function to fetch scam details based on phone number
    const fetchScamDetails = async phoneNumber => {
      try {
        const cleanPhoneNumber = phoneNumber.replace(/\D/g, ''); // Clean the phone number
        const {data, error} = await supabase
          .from('scammers')
          .select('scam_no, scam_mes')
          .eq('scam_no', cleanPhoneNumber);

        if (error) {
          console.error('Error fetching scam details:', error);
          return null;
        }

        return data.length ? data[0] : null; // Return the scam details if found
      } catch (error) {
        console.error('Error fetching scam details:', error);
        return null;
      }
    };

    // Initialize call detection
    const callDetector = new CallDetectorManager(async (event, number) => {
      if (event === 'Incoming') {
        const scamDetails = await fetchScamDetails(number);
        if (scamDetails) {
          Alert.alert(
            'Scam call detected',
            `Number: ${scamDetails.scam_no}\nMessage: ${scamDetails.scam_mes}`,
          );
        } else {
          Alert.alert('Incoming call from: ' + number);
        }
      }
    }, true);

    return () => {
      callDetector && callDetector.dispose();
    };
  }, []);

  return null;
};

export default App;
