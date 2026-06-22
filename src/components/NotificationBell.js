import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { colors, radii } from '../theme';

export default function NotificationBell({ onPress, unreadCount = 0 }) {
  const hasUnread = Number(unreadCount || 0) > 0;

  return (
    <Pressable onPress={onPress} style={[styles.button, hasUnread && styles.buttonUnread]}>
      <MaterialCommunityIcons
        color={hasUnread ? colors.secondary : colors.primary}
        name={hasUnread ? 'bell-ring-outline' : 'bell-outline'}
        size={24}
      />
      {hasUnread ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderColor: colors.surfaceLowest,
    borderRadius: radii.full,
    borderWidth: 2,
    minHeight: 18,
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -2,
    top: -2
  },
  badgeText: {
    color: colors.onPrimaryFixed,
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 14
  },
  button: {
    alignItems: 'center',
    borderRadius: radii.full,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  buttonUnread: {
    backgroundColor: 'rgba(255, 180, 171, 0.12)'
  }
});
