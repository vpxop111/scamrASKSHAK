import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView} from 'react-native';
import {supabase} from '../supabase'; // Adjust the import path if necessary

const Indian_law = ({route}) => {
  const {stype1} = route.params;
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Fetch solutions details where scam_type equals stype1
        const {data, error} = await supabase
          .from('indian_law')
          .select('scam_name, Indian_law')
          .eq('scam_type', stype1);

        if (error) {
          console.error('Error fetching solutions:', error.message);
          return;
        }

        setSolutions(data);
      } catch (error) {
        console.error('Error fetching details:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [stype1]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0D0E10]">
        <Text className="text-white">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-5 bg-[#0D0E10]">
      <Text className="text-2xl font-bold mb-5 text-[#ddff00]">
        Details for {stype1}
      </Text>
      <ScrollView>
        {solutions.length > 0 ? (
          <View>
            {solutions.map((solu, index) => (
              <View key={index} className="mb-5">
                <Text className="text-lg mb-2 text-white">
                  Scam Name: {solu.scam_name}
                </Text>
                <Text className="text-base text-white">
                  Indian Law: {solu.Indian_law}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-white">No details found for {stype1}</Text>
        )}
      </ScrollView>
    </View>
  );
};

export default Indian_law;
