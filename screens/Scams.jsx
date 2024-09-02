import React, {useState, useEffect} from 'react';
import {View, Text, FlatList, Button} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {supabase} from '../supabase'; // Adjust the import path if necessary
import {TouchableOpacity} from 'react-native-gesture-handler';
import BottomNavigationBar from './BottomNavigation';
export default function Scams() {
  const [scams, setScams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const getScams = async () => {
      try {
        const {data, error} = await supabase.from('scam').select();

        if (error) {
          console.error('Error fetching scams:', error.message);
          return;
        }

        if (data) {
          // Filter out duplicate scam types
          const uniqueScams = Array.from(
            new Set(data.map(scam => scam.scam_type)),
          ).map(scam_type => data.find(scam => scam.scam_type === scam_type));
          setScams(uniqueScams);
        }
      } catch (error) {
        console.error('Error fetching scams:', error.message);
      } finally {
        setLoading(false);
      }
    };

    getScams();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading...</Text>
      </View>
    );
  }

  if (scams.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0D0E10]">
        <Text className="text-white">No scams found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-5 bg-[#0D0E10]">
      <Text className="text-2xl font-bold mb-5 text-white">Scam List</Text>
      <FlatList
        data={scams}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <View className="py-4 border-b border-gray-300">
            <TouchableOpacity
              className="bg-[#ddff00] p-5 rounded-lg"
              onPress={() =>
                navigation.navigate('mscam', {
                  stype: item.scam_type,
                  s_id: item.id,
                })
              }>
              <Text className="text-black text-xl font-bold">
                {item.scam_type}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <BottomNavigationBar />
    </View>
  );
}
