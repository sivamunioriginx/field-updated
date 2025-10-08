import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedRef,
    useAnimatedStyle,
    useScrollViewOffset,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/ThemedView';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { useColorScheme } from '@/hooks/useColorScheme';

const HEADER_HEIGHT = 5;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const bottom = useBottomTabOverflow();
  
  // Responsive padding calculation
  const getResponsivePadding = () => {
    const baseWidth = 400;
    const basePadding = 32;
    const scaledPadding = (basePadding * screenWidth) / baseWidth;
    return Math.min(Math.max(scaledPadding, 20), 40);
  };

  const getResponsiveGap = () => {
    const baseHeight = 800;
    const baseGap = 16;
    const scaledGap = (baseGap * screenHeight) / baseHeight;
    return Math.min(Math.max(scaledGap, 12), 24);
  };

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
        },
      ],
    };
  });

  const dynamicContentStyle = {
    flex: 1,
    padding: getResponsivePadding(),
    gap: getResponsiveGap(),
    overflow: 'hidden' as const,
  };

  return (
    <ThemedView style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom }}
        contentContainerStyle={{ paddingBottom: bottom }}>
        <Animated.View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor.light },
            headerAnimatedStyle,
          ]}>
          {headerImage}
        </Animated.View>
        <ThemedView style={dynamicContentStyle}>{children}</ThemedView>
      </Animated.ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
});
