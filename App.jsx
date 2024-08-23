import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {TaskProvider} from './TaskContext'; // Import TaskProvider
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
import Phoencall from './screens/Phoencall';
import Sms from './Sms';
import Website from './screens/Website';

const Stack = createStackNavigator();

const App = () => {
  return (
    <TaskProvider>
      {/* Wrap the app with TaskProvider */}
      <NavigationContainer>
        <Stack.Navigator>
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
          <Stack.Screen name="phone" component={Phoencall} />
          <Stack.Screen name="sms" component={Sms} />
          <Stack.Screen name="website" component={Website} />
        </Stack.Navigator>
      </NavigationContainer>
    </TaskProvider>
  );
};

export default App;
