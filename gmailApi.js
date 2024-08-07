import axios from 'axios';

const BASE_URL = 'https://www.googleapis.com/gmail/v1/users/me/messages';

export const getEmails = async accessToken => {
  const GOOGLE_API_KEY = 'AIzaSyAyzJF5nSUB9DLYd2DCl7-38S5KM7pGdvU';
  try {
    const response = await axios.get(`${BASE_URL}?maxResults=1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const latestMessageId = response.data.messages[0].id;

    const messageResponse = await axios.get(`${BASE_URL}/${latestMessageId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const emailData = {
      snippet: messageResponse.data.snippet,
    };

    return emailData;
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
};
