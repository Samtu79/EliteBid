import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, radii } from '../theme';

export default function ProductPhotoCarousel({ fallbackUri, height = 170, photos, title, variant = 'full' }) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const photoUris = useMemo(() => {
    const uniqueUris = [...new Set((photos || []).filter(Boolean))];
    if (!uniqueUris.length && fallbackUri) return [fallbackUri];
    return uniqueUris;
  }, [fallbackUri, photos]);

  if (!photoUris.length) return null;

  const horizontalPadding = variant === 'compact' ? 72 : 64;
  const slideWidth = Math.max(180, Math.min(width - horizontalPadding, variant === 'compact' ? 280 : 420));
  const snapInterval = slideWidth + 10;

  function handleScrollEnd(event) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
    setActiveIndex(Math.max(0, Math.min(photoUris.length - 1, nextIndex)));
  }

  return (
    <View style={[styles.wrapper, variant === 'compact' && styles.wrapperCompact]}>
      <ScrollView
        decelerationRate="fast"
        horizontal
        nestedScrollEnabled
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        snapToAlignment="start"
      >
        {photoUris.map((uri, index) => (
          <View key={`${uri}-${index}`} style={[styles.slide, { height, width: slideWidth }]}>
            <Image source={{ uri }} style={styles.image} />
            <View style={styles.counter}>
              <Text style={styles.counterText}>{index + 1}/{photoUris.length}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      {title ? <Text numberOfLines={1} style={styles.caption}>{title}</Text> : null}
      {photoUris.length > 1 ? (
        <View style={styles.dots}>
          {photoUris.map((uri, index) => (
            <View
              key={`dot-${uri}-${index}`}
              style={[styles.dot, activeIndex === index && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 7
  },
  counter: {
    backgroundColor: 'rgba(20, 5, 43, 0.72)',
    borderRadius: radii.full,
    bottom: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    position: 'absolute',
    right: 8
  },
  counterText: {
    color: colors.onSurface,
    fontSize: 10,
    fontWeight: '900'
  },
  dot: {
    backgroundColor: 'rgba(201, 196, 211, 0.34)',
    borderRadius: radii.full,
    height: 6,
    width: 6
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 16
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 8
  },
  image: {
    height: '100%',
    width: '100%'
  },
  slide: {
    backgroundColor: colors.surfaceHighest,
    borderColor: 'rgba(204, 193, 255, 0.16)',
    borderRadius: radii.md,
    borderWidth: 1,
    marginRight: 10,
    overflow: 'hidden'
  },
  wrapper: {
    marginTop: 12
  },
  wrapperCompact: {
    marginTop: 8
  }
});
