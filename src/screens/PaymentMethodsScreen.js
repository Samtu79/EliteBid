import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { getPaymentMethods } from '../backend/paymentService';
import { colors, radii, shadows } from '../theme';

export default function PaymentMethodsScreen({ onAdd, onBack, onContinue, user }) {
  const [methods, setMethods] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const verifiedTotal = useMemo(
    () =>
      methods
        .filter((method) => method.verified === 'si')
        .reduce((total, method) => total + Number(method.amount || 0), 0),
    [methods]
  );

  async function load() {
    const rows = await getPaymentMethods(user.clienteId);
    setMethods(rows);
  }

  useEffect(() => {
    load();
  }, [user.clienteId]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.surfaceLowest, colors.surface, colors.surfaceLow]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.iconButton}>
          <MaterialCommunityIcons color={colors.primary} name="arrow-left" size={25} />
        </Pressable>
        <Text style={styles.logo}>Elite Bid</Text>
        <Pressable style={styles.iconButton}>
          <MaterialCommunityIcons color={colors.primary} name="account-circle-outline" size={25} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={refresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Medios de Pago</Text>
          <Text style={styles.subtitle}>Gestiona tus tarjetas y cuentas para pujar con fluidez.</Text>
        </View>

        <View style={styles.walletCard}>
          <View style={styles.walletIcon}>
            <MaterialCommunityIcons color={colors.primary} name="wallet-outline" size={30} />
          </View>
          <View style={styles.walletCopy}>
            <Text style={styles.walletTitle}>Billetera Elite</Text>
            <Text style={styles.walletSubtitle}>Garantia verificada disponible</Text>
          </View>
          <Text style={styles.walletAmount}>{formatMoney(verifiedTotal)}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tarjetas y Cuentas</Text>
          <Text style={styles.sectionAction}>{methods.length} activos</Text>
        </View>

        {methods.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons color={colors.primary} name="credit-card-plus-outline" size={42} />
            <Text style={styles.emptyTitle}>Agrega tu primer medio</Text>
            <Text style={styles.emptyCopy}>
              Necesitas al menos un medio de pago para poder pujar en subastas habilitadas.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.carousel}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {methods.map((method) => (
              <PaymentCard key={method.id} method={method} />
            ))}
          </ScrollView>
        )}
      </ScrollView>

      <View style={styles.bottomActions}>
        <Pressable onPress={onContinue} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Ir al inicio</Text>
        </Pressable>
        <Pressable onPress={onAdd} style={styles.fab}>
          <LinearGradient
            colors={[colors.primary, colors.primaryContainer]}
            style={styles.fabFill}
          >
            <MaterialCommunityIcons color={colors.onPrimaryFixed} name="plus" size={30} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function PaymentCard({ method }) {
  const pending = method.verified !== 'si';
  const title = getMethodTitle(method);
  const mask = getMethodMask(method);

  return (
    <View style={[styles.paymentCard, pending && styles.paymentCardPending]}>
      <View style={styles.paymentCardTop}>
        <View>
          <Text style={styles.paymentBrand}>{title}</Text>
          <Text style={styles.paymentKind}>{getKindLabel(method.type)}</Text>
        </View>
        <View style={[styles.statusChip, pending && styles.statusChipPending]}>
          <MaterialCommunityIcons
            color={pending ? colors.onSurfaceVariant : colors.tertiary}
            name={pending ? 'clock-outline' : 'check-circle-outline'}
            size={13}
          />
          <Text style={[styles.statusText, pending && styles.statusTextPending]}>
            {pending ? 'Pendiente' : 'Verificado'}
          </Text>
        </View>
      </View>

      <View style={styles.paymentCardBottom}>
        <Text style={styles.paymentMask}>{mask}</Text>
        <Text style={styles.paymentAmount}>{formatMoney(method.amount, method.currency)}</Text>
      </View>
    </View>
  );
}

function getMethodTitle(method) {
  if (method.type === 'tarjeta') return method.parsedDetail.brand ?? 'Tarjeta';
  if (method.type === 'cuenta') return method.parsedDetail.bank ?? 'Cuenta bancaria';
  return method.parsedDetail.bank ?? 'Cheque certificado';
}

function getMethodMask(method) {
  if (method.type === 'tarjeta') return `**** ${method.parsedDetail.cardNumberLast4 ?? '0000'}`;
  if (method.type === 'cuenta') return `CBU **** ${method.parsedDetail.cbuLast4 ?? '0000'}`;
  return `Cheque **** ${method.parsedDetail.checkNumberLast4 ?? '0000'}`;
}

function getKindLabel(type) {
  if (type === 'tarjeta') return 'Tarjeta';
  if (type === 'cuenta') return 'Cuenta bancaria';
  return 'Validacion fisica';
}

function formatMoney(value, currency = 'ARS') {
  return `${currency} ${Number(value || 0).toLocaleString('es-AR', {
    maximumFractionDigits: 0
  })}`;
}

const styles = StyleSheet.create({
  bottomActions: {
    alignItems: 'center',
    bottom: 24,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'flex-end',
    left: 24,
    position: 'absolute',
    right: 24
  },
  carousel: {
    gap: 14,
    paddingBottom: 120,
    paddingRight: 24
  },
  container: {
    backgroundColor: colors.surfaceLowest,
    flex: 1
  },
  content: {
    padding: 24,
    paddingBottom: 150,
    paddingTop: 26
  },
  emptyCopy: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center'
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderColor: 'rgba(72, 69, 81, 0.26)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 28
  },
  emptyTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12
  },
  fab: {
    borderRadius: radii.full,
    overflow: 'hidden',
    ...shadows.ambient
  },
  fabFill: {
    alignItems: 'center',
    height: 58,
    justifyContent: 'center',
    width: 58
  },
  header: {
    marginBottom: 22
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  logo: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  paymentAmount: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800'
  },
  paymentBrand: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: '900'
  },
  paymentCard: {
    backgroundColor: colors.surfaceBright,
    borderColor: 'rgba(72, 69, 81, 0.28)',
    borderRadius: 24,
    borderWidth: 1,
    height: 176,
    justifyContent: 'space-between',
    padding: 20,
    width: 288,
    ...shadows.ambient
  },
  paymentCardBottom: {
    gap: 6
  },
  paymentCardPending: {
    backgroundColor: colors.surfaceContainer
  },
  paymentCardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  paymentKind: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase'
  },
  paymentMask: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0
  },
  sectionAction: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800'
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 19,
    fontWeight: '900'
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(38, 24, 62, 0.92)',
    borderColor: 'rgba(147, 143, 156, 0.34)',
    borderRadius: radii.full,
    borderWidth: 1,
    flex: 1,
    height: 54,
    justifyContent: 'center'
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  statusChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(49, 34, 73, 0.8)',
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  statusChipPending: {
    backgroundColor: colors.surfaceLowest
  },
  statusText: {
    color: colors.tertiary,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  statusTextPending: {
    color: colors.onSurfaceVariant
  },
  subtitle: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20
  },
  title: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 11, 49, 0.88)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 42
  },
  walletAmount: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 16
  },
  walletCard: {
    backgroundColor: colors.surfaceHigh,
    borderColor: 'rgba(72, 69, 81, 0.24)',
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 30,
    padding: 20
  },
  walletCopy: {
    marginTop: 14
  },
  walletIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.full,
    height: 52,
    justifyContent: 'center',
    width: 52
  },
  walletSubtitle: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4
  },
  walletTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: '900'
  }
});
