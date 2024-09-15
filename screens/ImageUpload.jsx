import React, { useState, useRef } from 'react';
import { View, Text, Button, Image, Alert, ActivityIndicator, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';

export default function App() {
  const [image, setImage] = useState(null);
  const [extractedText, setExtractedText] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(); // Create a ref for the ScrollView

  const pickImageFromGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
      },
      response => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorMessage) {
          console.log('ImagePicker Error: ', response.errorMessage);
        } else if (response.assets) {
          const uri = response.assets[0].uri;
          setImage(uri);
          console.log('Image picked from gallery: ', response.assets[0]); // Log image details
          performOCR(response.assets[0]);
        }
      },
    );
  };

  const captureImageFromCamera = () => {
    launchCamera(
      {
        mediaType: 'photo',
        includeBase64: false,
      },
      response => {
        if (response.didCancel) {
          console.log('User cancelled camera');
        } else if (response.errorMessage) {
          console.log('Camera Error: ', response.errorMessage);
        } else if (response.assets) {
          const uri = response.assets[0].uri;
          setImage(uri);
          console.log('Image captured from camera: ', response.assets[0]); // Log image details
          performOCR(response.assets[0]);
        }
      },
    );
  };

  const performOCR = async (file) => {
    const formData = new FormData();

    console.log('Preparing image for OCR: ', file);

    formData.append('image', {
      uri: file.uri,
      name: file.fileName || 'photo.jpg',
      type: file.type || 'image/jpeg',
    });

    console.log('FormData created:', formData); // Log FormData details

    setLoading(true);

    try {
      console.log('Sending image to OCR API...');

      const response = await axios.post('https://api.api-ninjas.com/v1/imagetotext', formData, {
        headers: {
          'X-Api-Key': 'eMe25+H2EpVZlz/rFaSASA==sH6conkNDWj6uNF0', // Replace with your actual API key
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('OCR API Response:', response.data); // Log entire response data from the API

      if (response.data && Array.isArray(response.data)) {
        const textArray = response.data.map(item => item.text);
        console.log('Text Array:', textArray); // Log the array of text items

        const sentences = textArray.join(' ').split(/(?<=[.!?])\s+/); // Split by punctuation followed by whitespace
        console.log('Extracted Sentences:', sentences); // Log the extracted sentences
        setExtractedText(sentences);
        sendToScamAPI(sentences); // Send the sentences to the Scam API
      } else {
        console.log('No text found in response data');
        setExtractedText(['No text found']);
      }

    } catch (error) {
      console.error('Error performing OCR:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data); // Log server response errors
      }
      Alert.alert('Error', 'Failed to extract text from image');
    } finally {
      setLoading(false);
    }
  };

  const sendToScamAPI = async (messages) => {
    setLoading(true);
    console.log('Sending messages to scam detection API:', messages);

    try {
      const response = await axios.post('https://varun324242-dds.hf.space/predict', {
        messages: messages,
      });

      console.log('Scam Detection API Response:', response.data); // Log the response from the scam detection API

      // Process and format the response
      if (response.data && response.data.predictions) {
        const formattedResult = response.data.predictions.map((prediction, index) => {
          const messageStatus = prediction.scam_class;
          const probability = (prediction.scam_probability * 100).toFixed(2);
          return `Message ${index + 1}: ${messageStatus} (Probability: ${probability}%)\n"${prediction.message}"`;
        }).join('\n\n');

        console.log('Formatted Scam Detection Results:', formattedResult); // Log formatted results
        Alert.alert('Scam Detection Results', formattedResult); // Show results in alert
      } else {
        Alert.alert('Error', 'Invalid response from scam detection API');
      }

    } catch (error) {
      console.error('Error sending data to scam detection API:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data); // Log server response errors
      }
      Alert.alert('Error', 'Failed to analyze messages');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-black">
      <View className="flex-1 justify-center items-center">
        <Text className="text-3xl font-bold text-[#ddff00] mb-4 mt-10">Image to Text App</Text>
        <TouchableOpacity onPress={pickImageFromGallery} className="bg-[#ddff00] p-5 text-center rounded-xl mt-5 mb-5">
          <Text className="text-black text-xl font-bold">Pick an Image</Text>
        </TouchableOpacity>
        
        {image && <Image source={{ uri: image }} className="w-72 h-72 resize-mode-contain my-2" />}
        {loading && <ActivityIndicator size="large" color="#ddff00" />}
        <Text className="text-xl font-bold text-[#ddff00] mt-5">Extracted Text:</Text>
        {extractedText.map((sentence, index) => (
          <Text key={index} className="text-base mt-2 text-white text-center">{sentence}</Text>
        ))}
      </View>
    </ScrollView>
  );
}
