import React, {useState, useEffect} from 'react';
import {View, Text} from 'react-native';
import {supabase} from '../supabase'; // Adjust the import path if necessary
const Scam1 = ({route}) => {
  const {stype1} = route.params;
  const [scams, setScams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScams = async () => {
      try {
        const {data, error} = await supabase
          .from('scam')
          .select('*')
          .eq('scam_type', stype1); // Compare "scam_type" with "stype1"

        if (error) {
          console.error('Error fetching scams:', error.message);
          return;
        }

        if (data && data.length > 0) {
          setScams(data);
        } else {
          setScams([]);
        }
      } catch (error) {
        console.error('Error fetching scams:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchScams();
  }, [stype1]); // Fetch again when stype1 changes

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
        Scam List for {stype1}
      </Text>
      {scams.length > 0 ? (
        <View>
          {scams.map(scam => (
            <Text key={scam.id} className="text-white text-lg mb-2">
              {scam.scam_name}
            </Text>
          ))}
        </View>
      ) : (
        <Text className="text-white">No scams found for {stype1}</Text>
      )}
    </View>
  );
};

export default Scam1;
