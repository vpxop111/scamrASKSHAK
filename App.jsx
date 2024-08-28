import React, {useContext, useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {TaskProvider} from './TaskContext'; // Import TaskProvider
import {AuthProvider, AuthContext} from './AuthContext'; // Import AuthProvider and AuthContext
import Home from './screens/Home';
import Welcome from './screens/Welcome';
import Signup from './screens/Signup';
import Login from './screens/Login';
import Scamnews from './screens/Scamnews';
import Mainscam from './screens/Mainscam';
import Scam1 from './screens/Scam1';
import Solution from './screens/Solution';
import Indian_law from './screens/Indian_law';
import UsaLaw from './screens/UsaLaw';
import Resource from './screens/Resource';
import Scamai from './screens/Scamai';
import Scams from './screens/Scams';
import Gmail1 from './Gmail1';
import Sms from './Sms';
import Website from './screens/Website';
import Phone from './screens/Phone';
import SpecificNews from './screens/SpecificNews';
const Stack = createStackNavigator();

const App = () => {
  return (
    <AuthProvider>
      <TaskProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen
              name="Welcome"
              component={Welcome}
              initialParams={{paramName: 'navigation'}}
            />
            <Stack.Screen
              name="Signup"
              component={Signup}
              initialParams={{paramName: 'navigation'}}
            />
            <Stack.Screen
              name="Login"
              component={Login}
              initialParams={{paramName: 'navigation'}}
            />
            <Stack.Screen
              name="Home"
              component={Home}
              initialParams={{paramName: 'navigation'}}
            />
            <Stack.Screen
              name="scams"
              component={Scams}
              initialParams={{paramName: 'navigation'}}
            />
            <Stack.Screen name="gmail" component={Gmail1} />
            <Stack.Screen name="phone" component={Phone} />
            <Stack.Screen name="sms" component={Sms} />
            <Stack.Screen
              name="scam"
              component={Scams}
              initialParams={{paramName: 'navigation'}}
            />
            <Stack.Screen name="mscam" component={Mainscam} />
            <Stack.Screen name="news" component={Scamnews} />
            <Stack.Screen name="scamlist" component={Scam1} />
            <Stack.Screen name="solution" component={Solution} />
            <Stack.Screen name="i_law" component={Indian_law} />
            <Stack.Screen name="u_law" component={UsaLaw} />
            <Stack.Screen name="resource" component={Resource} />
            <Stack.Screen name="SpecificNews" component={SpecificNews} />
            <Stack.Screen name="ai" component={Scamai} />
          </Stack.Navigator>
        </NavigationContainer>
      </TaskProvider>
    </AuthProvider>
  );
};

export default App;
