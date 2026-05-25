import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { getUserPenalties } from '../backend/penaltyService';
import { colors, radii } from '../theme';

export default function PenaltiesScreen({ onBack, user }) {
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const rows = await getUserPenalties(user.clienteId);

      if (mounted) {
        setPenalties(rows);
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [user.clienteId]);

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
        <Text style={styles.logo}>Penalidades</Text>
        <View style={styles.iconButton} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Estado de cuenta</Text>
          <Text style={styles.subtitle}>Listado de penalidades asociadas a tu usuario.</Text>

          {penalties.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons color={colors.primary} name="shield-check-outline" size={46} />
              <Text style={styles.emptyTitle}>Sin penalidades</Text>
              <Text style={styles.emptyCopy}>Tu cuenta no tiene restricciones activas.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {penalties.map((penalty) => (
                <PenaltyCard key={penalty.id} penalty={penalty} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function PenaltyCard({ penalty }) {
  const active = penalty.status === 'activa';

  return (
    <View style={[styles.card, active && styles.cardActive]}>
      <View style={styles.cardIcon}>
        <MaterialCommunityIcons
          color={active ? colors.error : colors.onSurfaceVariant}
          name={active ? 'alert-circle-outline' : 'check-circle-outline'}
          size={28}
        />
      </View>
      <View style={styles.cardCopy}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{penalty.title}</Text>
          <Text style={styles.amount}>{formatMoney(penalty.amount)}</Text>
        </View>
        <Text style={styles.description}>{penalty.description}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.status, active && styles.statusActive]}>{penalty.status}</Text>
          <Text style={styles.dueDate}>Vence: {formatDate(penalty.dueDate)}</Text>
        </View>
      </View>
    </View>
  );
}

function formatMoney(value) {
  return `$ ${Number(value || 0).toLocaleString('es-AR', {
    maximumFractionDigits: 0
  })}`;
}

function formatDate(date) {
  if (!date) return 'sin fecha';

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${date}T12:00:00`));
}

const styles = StyleSheet.create({
  amount: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '900'
  },
  card: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceContainer,
    borderColor: 'rgba(72, 69, 81, 0.28)',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    padding: 16
  },
  cardActive: {
    borderColor: 'rgba(255, 180, 171, 0.26)'
  },
  cardCopy: {
    flex: 1
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  cardIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
    borderRadius: radii.full,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  cardTitle: {
    color: colors.onSurface,
    flex: 1,
    fontSize: 16,
    fontWeight: '900'
  },
  container: {
    backgroundColor: colors.surfaceLowest,
    flex: 1
  },
  content: {
    padding: 22,
    paddingBottom: 44
  },
  description: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 7
  },
  dueDate: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '800'
  },
  emptyCopy: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center'
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 24,
    marginTop: 20,
    padding: 28
  },
  emptyTitle: {
    color: colors.onSurface,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  list: {
    gap: 13,
    marginTop: 20
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
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12
  },
  status: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  statusActive: {
    color: colors.error
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
    marginBottom: 8
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 11, 49, 0.95)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 42
  }
});
