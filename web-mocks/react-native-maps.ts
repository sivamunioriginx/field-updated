// Web mock for react-native-maps
import React from 'react';
import { View } from 'react-native';

// Create a simple MapView component for web
const MapView = React.forwardRef((props: any, ref: any) => {
  return React.createElement(View, { ...props, ref: ref });
});

MapView.displayName = 'MapView';

export const Marker = View;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

export default MapView;

