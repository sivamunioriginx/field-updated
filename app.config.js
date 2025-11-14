import 'dotenv/config';

const IS_CUSTOMER_APP = process.env.EXPO_PUBLIC_APP_VARIANT === 'customer';

export default {
  expo: {
    name: IS_CUSTOMER_APP ? "Customer" : "Worker",
    slug: IS_CUSTOMER_APP ? "field-customer" : "field-worker",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: IS_CUSTOMER_APP ? "fieldcustomer" : "fieldworker",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_CUSTOMER_APP
        ? "com.yourcompany.field.customer"
        : "com.yourcompany.field.worker",
      config: {
        googleMapsApiKey: "AIzaSyAL-aVnUdrc0p2o0iWCSsjgKoqW5ywd0MQ"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: IS_CUSTOMER_APP
        ? "com.yourcompany.field.customer"
        : "com.yourcompany.field.worker",
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "MEDIA_LIBRARY",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: "AIzaSyAL-aVnUdrc0p2o0iWCSsjgKoqW5ywd0MQ"
        }
      },
      versionCode: 1
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-document-picker",
      "expo-image-picker",
      "expo-media-library"
    ],
    extra: {
      expoGo: true,
      eas: {
        projectId: "your-project-id"
      },
      appType: IS_CUSTOMER_APP ? "customer" : "worker"
    },
    experiments: {
      typedRoutes: true
    }
  }
};
