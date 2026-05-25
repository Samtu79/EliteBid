import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';

import { initDatabase } from './src/backend/database';
import { getActiveSession, signOut } from './src/backend/authService';
import AddPaymentScreen from './src/screens/AddPaymentScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import PaymentMethodsScreen from './src/screens/PaymentMethodsScreen';
import PenaltiesScreen from './src/screens/PenaltiesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import { colors } from './src/theme';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [appView, setAppView] = useState('home');
  const [paymentBackView, setPaymentBackView] = useState('home');

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        await initDatabase();
        const sessionUser = await getActiveSession();

        if (mounted) {
          setUser(sessionUser);
        }
      } catch (error) {
        console.warn('No se pudo iniciar EliteBid', error);
      } finally {
        if (mounted) {
          setBooting(false);
        }
      }
    }

    boot();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSignOut() {
    await signOut(user?.sessionToken);
    setUser(null);
    setAuthView('login');
    setAppView('home');
  }

  function handleAuthenticated(sessionUser, nextView = 'home') {
    setUser(sessionUser);
    setAuthView('login');
    setAppView(nextView);
  }

  function openPayments(fromView) {
    setPaymentBackView(fromView);
    setAppView('payments');
  }

  if (booting) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor={colors.surfaceLowest} />
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Elite Bid</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.surfaceLowest} />
      {user && appView === 'payments' ? (
        <PaymentMethodsScreen
          onAdd={() => setAppView('addPayment')}
          onBack={() => setAppView(paymentBackView)}
          onUserUpdated={setUser}
          user={user}
        />
      ) : user && appView === 'registrationPayments' ? (
        <PaymentMethodsScreen
          onAdd={() => setAppView('registrationAddPayment')}
          onBack={() => setAppView('home')}
          user={user}
        />
      ) : user && appView === 'addPayment' ? (
        <AddPaymentScreen
          onBack={() => setAppView('payments')}
          onSaved={(updatedUser) => {
            setUser(updatedUser);
            setAppView('payments');
          }}
          user={user}
        />
      ) : user && appView === 'registrationAddPayment' ? (
        <AddPaymentScreen
          onBack={() => setAppView('registrationPayments')}
          onSaved={(updatedUser) => {
            setUser(updatedUser);
            setAppView('home');
          }}
          user={user}
        />
      ) : user && appView === 'profile' ? (
        <ProfileScreen
          onBack={() => setAppView('home')}
          onGoHome={() => setAppView('home')}
          onOpenPayments={() => openPayments('profile')}
          onOpenPenalties={() => setAppView('penalties')}
          onSignOut={handleSignOut}
          onUserUpdated={setUser}
          user={user}
        />
      ) : user && appView === 'penalties' ? (
        <PenaltiesScreen onBack={() => setAppView('profile')} user={user} />
      ) : user ? (
        <HomeScreen
          onOpenPayments={() => openPayments('home')}
          onOpenProfile={() => setAppView('profile')}
          user={user}
          onSignOut={handleSignOut}
        />
      ) : authView === 'register' ? (
        <RegisterScreen
          onBack={() => setAuthView('login')}
          onRegistered={(sessionUser) => handleAuthenticated(sessionUser, 'registrationPayments')}
        />
      ) : authView === 'reset' ? (
        <ResetPasswordScreen onBack={() => setAuthView('login')} />
      ) : (
        <LoginScreen
          onForgotPassword={() => setAuthView('reset')}
          onLogin={handleAuthenticated}
          onRegister={() => setAuthView('register')}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLowest,
    flex: 1,
    justifyContent: 'center'
  },
  loadingText: {
    color: colors.primaryContainer,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 18,
    textTransform: 'uppercase'
  }
});
