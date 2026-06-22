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
  const [activeView, setActiveView] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [payingId, setPayingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState(null);

  async function load() {
    const rows = await getUserPurchases(user.clienteId);
    setPurchases(rows);
    setAddresses(Object.fromEntries(rows.map((purchase) => [purchase.id, purchase.deliveryAddress || ''])));
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
      setToast({ message: 'Ingresá una dirección de entrega.', tone: 'danger' });
      return;
    }

    setSavingId(purchase.id);
    try {
      const rows = await savePurchaseDeliveryAddress(user.clienteId, purchase.id, deliveryAddress);
      setPurchases(rows);
      setAddresses(Object.fromEntries(rows.map((item) => [item.id, item.deliveryAddress || ''])));
      setToast({ message: 'Dirección de entrega guardada.', tone: 'success' });
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
      setToast({ message: 'Pago confirmado. La compra quedó registrada.', tone: 'success' });
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
  const showingPending = activeView === 'pending';
  const visiblePurchases = showingPending ? pendingPurchases : completedPurchases;

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
            <Text style={styles.title}>Mis productos ganados</Text>
            <Text style={styles.subtitle}>
              Elegí si querés completar pendientes o consultar el estado de tus productos.
            </Text>
          </View>

          {purchases.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons color={colors.primary} name="gavel" size={42} />
              <Text style={styles.emptyTitle}>Sin productos ganados</Text>
              <Text style={styles.emptyCopy}>Cuando ganes una pieza, va a aparecer acá con su pago y estado de entrega.</Text>
            </View>
          ) : (
            <>
              <View style={styles.switcher}>
                <ModeButton active={showingPending} count={pendingPurchases.length} icon="file-document-edit-outline" label="Completar" onPress={() => setActiveView('pending')} />
                <ModeButton active={!showingPending} count={completedPurchases.length} icon="truck-check-outline" label="Estado" onPress={() => setActiveView('completed')} />
              </View>
              <View style={styles.purchaseSection}>
                <Text style={styles.purchaseSectionTitle}>{showingPending ? 'Completá tus datos' : 'Estado de tus productos'}</Text>
                <Text style={styles.purchaseSectionCopy}>
                  {showingPending
                    ? 'Finalizá el pago o cargá la dirección de entrega para preparar cada producto.'
                    : 'Consultá el seguimiento de los productos con pago y entrega confirmados.'}
                </Text>
                {visiblePurchases.length ? (
                  <View style={styles.list}>
                    {visiblePurchases.map((purchase) => (
                      <PurchaseCard
                        address={addresses[purchase.id] || ''}
                        completed={!showingPending}
                        key={purchase.id}
                        onConfirmPayment={confirmPayment}
                        onSaveAddress={saveAddress}
                        onUpdateAddress={updateAddress}
                        paying={payingId === purchase.id}
                        purchase={purchase}
                        saving={savingId === purchase.id}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.inlineEmpty}>
                    <MaterialCommunityIcons color={colors.onSurfaceVariant} name="check-circle-outline" size={20} />
                    <Text style={styles.inlineEmptyText}>
                      {showingPending ? 'No tenés productos ganados con datos pendientes.' : 'Todavía no tenés productos ganados en seguimiento.'}
                    </Text>
                  </View>
                )}
              </View>
            </>
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

function ModeButton({ active, count, icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeButton, active && styles.modeButtonActive]}>
      <MaterialCommunityIcons color={active ? colors.onPrimaryFixed : colors.onSurfaceVariant} name={icon} size={18} />
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
      <Text style={[styles.modeCount, active && styles.modeCountActive]}>{count}</Text>
    </Pressable>
  );
}

function PurchaseCard({
  address,
  completed,
  onConfirmPayment,
  onSaveAddress,
  onUpdateAddress,
  paying,
  purchase,
  saving
}) {
  const hasSavedDelivery = Boolean(purchase.deliveryAddress?.trim());

  return (
    <View style={styles.card}>
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
          <Amount label="Comisión" value={formatMoney(purchase.commission)} />
          <Amount label="Envío" value={formatMoney(purchase.shippingCost)} />
        </View>
        <Text style={styles.total}>{purchase.paymentStatus === 'pagada' ? 'Total debitado' : 'Total a pagar'} {formatMoney(purchase.totalDue)}</Text>

        {completed ? (
          <>
            <View style={styles.trackingBox}>
              <View style={styles.trackingHeader}>
                <MaterialCommunityIcons color="#73E6A2" name="truck-check-outline" size={20} />
                <Text style={styles.trackingTitle}>Estado del producto</Text>
              </View>
              <TrackingStep done label="Pago acreditado" />
              <TrackingStep done label="Dirección de entrega confirmada" />
              <TrackingStep done={purchase.deliveryStatus === 'preparando_envio'} label={getDeliveryStatusCopy(purchase)} />
            </View>
            <View style={styles.deliverySummary}>
              <Text style={styles.fieldLabel}>Dirección de entrega</Text>
              <Text style={styles.deliverySummaryText}>{purchase.deliveryAddress}</Text>
            </View>
          </>
        ) : (
          <>
            {purchase.paymentStatus === 'pagada' ? (
              <View style={styles.paidNotice}>
                <MaterialCommunityIcons color="#73E6A2" name="check-decagram" size={18} />
                <Text style={styles.paidNoticeText}>Pago acreditado con tu medio seleccionado.</Text>
              </View>
            ) : (
              <Pressable disabled={paying} onPress={() => onConfirmPayment(purchase)} style={styles.payButton}>
                {paying ? (
                  <ActivityIndicator color={colors.onPrimaryFixed} />
                ) : (
                  <>
                    <Text style={styles.payButtonText}>Confirmar pago</Text>
                    <MaterialCommunityIcons color={colors.onPrimaryFixed} name="cash-check" size={18} />
                  </>
                )}
              </Pressable>
            )}

            <Text style={styles.fieldLabel}>Dirección de entrega</Text>
            <TextInput
              editable={!hasSavedDelivery && !saving}
              multiline
              onChangeText={(value) => onUpdateAddress(purchase.id, value)}
              placeholder="Calle, número, piso/depto, ciudad"
              placeholderTextColor="rgba(201, 196, 211, 0.55)"
              style={styles.input}
              value={address}
            />
            <Pressable
              disabled={saving || hasSavedDelivery}
              onPress={() => onSaveAddress(purchase)}
              style={[styles.saveButton, hasSavedDelivery && styles.buttonDisabled]}
            >
              {saving ? (
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
          </>
        )}
      </View>
    </View>
  );
}

function getPurchaseStatusLabel(purchase) {
  if (purchase.paymentStatus === 'multa') return 'Multa activa';
  if (purchase.paymentStatus !== 'pagada') return 'Pago pendiente';
  if (purchase.deliveryStatus === 'pendiente_direccion') return 'Falta domicilio';
  return 'En preparación';
}

function isCompletedPurchase(purchase) {
  return purchase.paymentStatus === 'pagada' && purchase.deliveryStatus === 'preparando_envio';
}

function getStatusTone(purchase) {
  if (purchase.paymentStatus === 'multa' || purchase.paymentStatus !== 'pagada') return 'danger';
  return purchase.deliveryStatus === 'preparando_envio' ? 'success' : 'neutral';
}

function getDeliveryStatusCopy(purchase) {
  if (purchase.deliveryStatus === 'preparando_envio') return 'Preparando envío';
  return 'Entrega pendiente de preparación';
}

function TrackingStep({ done, label }) {
  return (
    <View style={styles.trackingStep}>
      <MaterialCommunityIcons
        color={done ? '#73E6A2' : colors.onSurfaceVariant}
        name={done ? 'check-circle' : 'clock-outline'}
        size={16}
      />
      <Text style={[styles.trackingStepText, done && styles.trackingStepTextDone]}>{label}</Text>
    </View>
  );
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
  buttonDisabled: {
    opacity: 0.55
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
  container: {
    backgroundColor: colors.surfaceLowest,
    flex: 1
  },
  content: {
    padding: 18,
    paddingBottom: bottomNavHeight + 34
  },
  deliverySummary: {
    backgroundColor: 'rgba(20, 5, 43, 0.32)',
    borderColor: 'rgba(204, 193, 255, 0.12)',
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 14,
    padding: 12
  },
  deliverySummaryText: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 6
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
  groups: {
    gap: 24
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
  inlineEmpty: {
    alignItems: 'center',
    backgroundColor: 'rgba(204, 193, 255, 0.08)',
    borderColor: 'rgba(204, 193, 255, 0.12)',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 12
  },
  inlineEmptyText: {
    color: colors.onSurfaceVariant,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17
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
  list: {
    gap: 16
  },
  modeButton: {
    alignItems: 'center',
    borderColor: 'rgba(147, 143, 156, 0.28)',
    borderRadius: radii.full,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center'
  },
  modeButtonActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer
  },
  modeCount: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '900'
  },
  modeCountActive: {
    color: colors.onPrimaryFixed
  },
  modeText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  modeTextActive: {
    color: colors.onPrimaryFixed
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
  statusDanger: {
    backgroundColor: 'rgba(255, 180, 171, 0.14)',
    borderColor: 'rgba(255, 180, 171, 0.38)'
  },
  statusPill: {
    backgroundColor: 'rgba(204, 193, 255, 0.12)',
    borderColor: 'rgba(204, 193, 255, 0.22)',
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6
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
  switcher: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
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
  },
  trackingBox: {
    backgroundColor: 'rgba(115, 230, 162, 0.08)',
    borderColor: 'rgba(115, 230, 162, 0.22)',
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 8,
    marginTop: 14,
    padding: 12
  },
  trackingHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2
  },
  trackingStep: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  trackingStepText: {
    color: colors.onSurfaceVariant,
    flex: 1,
    fontSize: 12,
    fontWeight: '800'
  },
  trackingStepTextDone: {
    color: colors.onSurface
  },
  trackingTitle: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  }
});
