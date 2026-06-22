import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { getUserPurchases, savePurchaseDeliveryAddress, settlePurchase } from '../backend/auctionService';
import AppToast from '../components/AppToast';
import BottomNav, { bottomNavHeight } from '../components/BottomNav';
import { colors, radii } from '../theme';

export default function WonBidsScreen({ onBack, onNavigate, user }) {
  const [addresses, setAddresses] = useState({});
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [payingId, setPayingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState(null);

  async function load() {
    const rows = await getUserPurchases(user.clienteId);
    setPurchases(rows);
    setAddresses(
      Object.fromEntries(rows.map((purchase) => [purchase.id, purchase.deliveryAddress || '']))
    );
  }

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const rows = await getUserPurchases(user.clienteId);
        if (mounted) {
          setPurchases(rows);
          setAddresses(Object.fromEntries(rows.map((purchase) => [purchase.id, purchase.deliveryAddress || ''])));
        }
      } catch (error) {
        if (mounted) setToast({ message: error.message, tone: 'danger' });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [user.clienteId]);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  function updateAddress(bidId, value) {
    setAddresses((current) => ({ ...current, [bidId]: value }));
  }

  async function saveAddress(purchase) {
    const deliveryAddress = addresses[purchase.id]?.trim() || '';
    if (!deliveryAddress) {
      setToast({ message: 'Ingresa una direccion de entrega.', tone: 'danger' });
      return;
    }

    setSavingId(purchase.id);
    try {
      const rows = await savePurchaseDeliveryAddress(user.clienteId, purchase.id, deliveryAddress);
      setPurchases(rows);
      setAddresses(Object.fromEntries(rows.map((item) => [item.id, item.deliveryAddress || ''])));
      setToast({ message: 'Direccion de entrega guardada.', tone: 'success' });
    } catch (error) {
      setToast({ message: error.message, tone: 'danger' });
    } finally {
      setSavingId(null);
    }
  }

  async function confirmPayment(purchase) {
    setPayingId(purchase.id);
    try {
      const rows = await settlePurchase(user.clienteId, purchase.id);
      setPurchases(rows);
      setAddresses(Object.fromEntries(rows.map((item) => [item.id, item.deliveryAddress || ''])));
      setToast({ message: 'Pago confirmado. La compra quedo registrada.', tone: 'success' });
    } catch (error) {
      setToast({ message: error.message, tone: 'danger' });
      try {
        await load();
      } catch {
        // El mensaje principal es el error de pago; el usuario puede refrescar manualmente.
      }
    } finally {
      setPayingId(null);
    }
  }

  const completedPurchases = purchases.filter(isCompletedPurchase);
  const pendingPurchases = purchases.filter((purchase) => !isCompletedPurchase(purchase));
  const purchaseGroups = [
    {
      id: 'pending',
      title: 'Pasos pendientes',
      description: 'Completá el pago o el domicilio de entrega para continuar.',
      purchases: pendingPurchases
    },
    {
      id: 'completed',
      title: 'Entregas en preparacion',
      description: 'Pago acreditado y domicilio de entrega confirmado.',
      purchases: completedPurchases
    }
  ];

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
        <Text style={styles.logo}>Mis Ganados</Text>
        <View style={styles.iconButton} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.primary} onRefresh={refresh} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Productos ganados</Text>
            <Text style={styles.subtitle}>Revisa el pago, carga tu domicilio cuando puedas y segui el estado de cada entrega.</Text>
          </View>

          {purchases.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons color={colors.primary} name="gavel" size={42} />
              <Text style={styles.emptyTitle}>Sin productos ganados</Text>
              <Text style={styles.emptyCopy}>Cuando ganes una pieza, va a aparecer aca con su pago y estado de entrega.</Text>
            </View>
          ) : (
            <View style={styles.groups}>
              {purchaseGroups.map((group) => group.purchases.length ? (
                <View key={group.id} style={styles.purchaseSection}>
                  <Text style={styles.purchaseSectionTitle}>{group.title} ({group.purchases.length})</Text>
                  <Text style={styles.purchaseSectionCopy}>{group.description}</Text>
                  <View style={styles.list}>
              {group.purchases.map((purchase) => {
                const hasSavedDelivery = Boolean(purchase.deliveryAddress?.trim());

                return (
                <View key={purchase.id} style={styles.card}>
                  <Image source={{ uri: purchase.imageUrl }} style={styles.image} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleWrap}>
                        <Text style={styles.cardMeta}>Pieza adjudicada</Text>
                        <Text numberOfLines={2} style={styles.cardTitle}>{purchase.title}</Text>
                      </View>
                      <View style={[styles.statusPill, getStatusTone(purchase) === 'danger' && styles.statusDanger, getStatusTone(purchase) === 'success' && styles.statusSuccess]}>
                        <Text style={styles.statusText}>{getPurchaseStatusLabel(purchase)}</Text>
                      </View>
                    </View>

                    <View style={styles.amountGrid}>
                      <Amount label="Puja" value={formatMoney(purchase.amount)} />
                      <Amount label="Comision" value={formatMoney(purchase.commission)} />
                      <Amount label="Envio" value={formatMoney(purchase.shippingCost)} />
                    </View>
                    <Text style={styles.total}>{purchase.paymentStatus === 'pagada' ? 'Total debitado' : 'Total a pagar'} {formatMoney(purchase.totalDue)}</Text>
                    {purchase.paymentStatus === 'pagada' ? (
                      <View style={styles.paidNotice}>
                        <MaterialCommunityIcons color="#73E6A2" name="check-decagram" size={18} />
                        <Text style={styles.paidNoticeText}>Pago acreditado con tu medio seleccionado.</Text>
                      </View>
                    ) : (
                      <Pressable
                        disabled={payingId === purchase.id}
                        onPress={() => confirmPayment(purchase)}
                        style={styles.payButton}
                      >
                        {payingId === purchase.id ? (
                          <ActivityIndicator color={colors.onPrimaryFixed} />
                        ) : (
                          <>
                            <Text style={styles.payButtonText}>Confirmar pago</Text>
                            <MaterialCommunityIcons color={colors.onPrimaryFixed} name="cash-check" size={18} />
                          </>
                        )}
                      </Pressable>
                    )}

                    <Text style={styles.fieldLabel}>Direccion de entrega</Text>
                    <TextInput
                      editable={!hasSavedDelivery && savingId !== purchase.id}
                      multiline
                      onChangeText={(value) => updateAddress(purchase.id, value)}
                      placeholder="Calle, numero, piso/depto, ciudad"
                      placeholderTextColor="rgba(201, 196, 211, 0.55)"
                      style={styles.input}
                      value={addresses[purchase.id] || ''}
                    />
                    <Pressable
                      disabled={savingId === purchase.id || hasSavedDelivery}
                      onPress={() => saveAddress(purchase)}
                      style={[styles.saveButton, hasSavedDelivery && styles.buttonDisabled]}
                    >
                      {savingId === purchase.id ? (
                        <ActivityIndicator color={colors.onPrimaryFixed} />
                      ) : (
                        <>
                          <Text style={styles.saveButtonText}>
                            {hasSavedDelivery ? 'Entrega guardada' : 'Guardar entrega'}
                          </Text>
                          <MaterialCommunityIcons
                            color={colors.onPrimaryFixed}
                            name={hasSavedDelivery ? 'check-circle-outline' : 'truck-delivery-outline'}
                            size={18}
                          />
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
                );
              })}
                  </View>
                </View>
              ) : null)}
            </View>
          )}
        </ScrollView>
      )}

      <BottomNav activeTab="profile" onNavigate={onNavigate} />
      <AppToast
        bottom={bottomNavHeight + 12}
        message={toast?.message}
        onDone={() => setToast(null)}
        tone={toast?.tone}
        visible={Boolean(toast)}
      />
    </View>
  );
}

function getPurchaseStatusLabel(purchase) {
  if (purchase.paymentStatus === 'multa') return 'Multa activa';
  if (purchase.paymentStatus !== 'pagada') return 'Pago pendiente';
  if (purchase.deliveryStatus === 'pendiente_direccion') return 'Falta domicilio';
  return 'En preparacion';
}

function isCompletedPurchase(purchase) {
  return purchase.paymentStatus === 'pagada' && purchase.deliveryStatus === 'preparando_envio';
}

function getStatusTone(purchase) {
  if (purchase.paymentStatus === 'multa' || purchase.paymentStatus !== 'pagada') return 'danger';
  return purchase.deliveryStatus === 'preparando_envio' ? 'success' : 'neutral';
}

function Amount({ label, value }) {
  return (
    <View style={styles.amountBox}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={styles.amountValue}>{value}</Text>
    </View>
  );
}

function formatMoney(value) {
  return `$ ${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

const styles = StyleSheet.create({
  amountBox: {
    flex: 1
  },
  amountGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14
  },
  amountLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  amountValue: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 3
  },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderColor: 'rgba(204, 193, 255, 0.18)',
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden'
  },
  cardBody: {
    padding: 16
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  cardMeta: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 5,
    textTransform: 'uppercase'
  },
  cardTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0
  },
  buttonDisabled: {
    opacity: 0.55
  },
  container: {
    backgroundColor: colors.surfaceLowest,
    flex: 1
  },
  content: {
    padding: 18,
    paddingBottom: bottomNavHeight + 34
  },
  emptyCopy: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center'
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderColor: 'rgba(204, 193, 255, 0.18)',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 22
  },
  emptyTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12
  },
  fieldLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 14,
    textTransform: 'uppercase'
  },
  header: {
    marginBottom: 18
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  image: {
    backgroundColor: colors.surfaceHighest,
    height: 156,
    width: '100%'
  },
  input: {
    backgroundColor: colors.surfaceHigh,
    borderColor: 'rgba(72, 69, 81, 0.42)',
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.onSurface,
    fontSize: 14,
    minHeight: 76,
    padding: 12,
    textAlignVertical: 'top'
  },
  payButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: 8,
    height: 42,
    justifyContent: 'center',
    marginTop: 12
  },
  payButtonText: {
    color: colors.onPrimaryFixed,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  paidNotice: {
    alignItems: 'center',
    backgroundColor: 'rgba(115, 230, 162, 0.1)',
    borderColor: 'rgba(115, 230, 162, 0.28)',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 11
  },
  paidNoticeText: {
    color: '#9BF0BE',
    flex: 1,
    fontSize: 12,
    fontWeight: '800'
  },
  groups: {
    gap: 24
  },
  list: {
    gap: 16
  },
  purchaseSection: {
    gap: 10
  },
  purchaseSectionCopy: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18
  },
  purchaseSectionTitle: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: '900'
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  logo: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
    marginTop: 12
  },
  saveButtonText: {
    color: colors.onPrimaryFixed,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  statusPill: {
    backgroundColor: 'rgba(204, 193, 255, 0.12)',
    borderColor: 'rgba(204, 193, 255, 0.22)',
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  statusDanger: {
    backgroundColor: 'rgba(255, 180, 171, 0.14)',
    borderColor: 'rgba(255, 180, 171, 0.38)'
  },
  statusSuccess: {
    backgroundColor: 'rgba(115, 230, 162, 0.12)',
    borderColor: 'rgba(115, 230, 162, 0.34)'
  },
  statusText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  subtitle: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8
  },
  title: {
    color: colors.onSurface,
    fontSize: 30,
    fontWeight: '900'
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 11, 49, 0.95)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingHorizontal: 18,
    paddingTop: 38
  },
  total: {
    color: colors.onSurface,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 12
  }
});
