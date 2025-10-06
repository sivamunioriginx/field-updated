# Dual APK Setup Guide

This guide explains how to build and deploy two separate APKs for your field service app - one for customers and one for workers, both sharing the same backend.

## Overview

- **Customer APK**: Contains all features (service booking, worker search, payments, etc.)
- **Worker APK**: Contains limited features (booking management, profile updates, earnings, etc.)
- **Shared Backend**: Both APKs connect to the same backend API

## File Structure

```
├── app.json                 # Original app configuration
├── app-customer.json        # Customer APK configuration
├── app-worker.json          # Worker APK configuration
├── eas.json                 # EAS build profiles
├── constants/
│   ├── features.ts          # Feature flags for each APK
│   └── backend.ts           # Shared backend configuration
└── scripts/
    ├── build-customer.js    # Customer APK build script
    ├── build-worker.js      # Worker APK build script
    └── build-both.js        # Build both APKs script
```

## Configuration Details

### Customer APK (`app-customer.json`)
- **Package Name**: `com.yourcompany.field.customer`
- **App Name**: "Field Service - Customer"
- **Features**: All customer features + shared features
- **Permissions**: Camera, Storage, Location, Media Library

### Worker APK (`app-worker.json`)
- **Package Name**: `com.yourcompany.field.worker`
- **App Name**: "Field Service - Worker"
- **Features**: Worker-specific features + shared features
- **Permissions**: Camera, Storage, Media Library

## Building the APKs

### Prerequisites
1. Install EAS CLI: `npm install -g @expo/eas-cli`
2. Login to EAS: `eas login`
3. Configure EAS project: `eas build:configure`

### Build Commands

#### Build Customer APK Only
```bash
npm run build:customer
```

#### Build Worker APK Only
```bash
npm run build:worker
```

#### Build Both APKs
```bash
npm run build:both
```

#### Local Builds (for testing)
```bash
npm run build:customer:local
npm run build:worker:local
```

## Feature Management

### Feature Flags
The app uses feature flags to control which features are available in each APK:

```typescript
import { isFeatureEnabled, isCustomerApp, isWorkerApp } from '@/constants/features';

// Check if a feature is enabled
if (isFeatureEnabled('customerBooking')) {
  // Show booking feature
}

// Check app type
if (isCustomerApp()) {
  // Customer-specific code
}
```

### Available Features

#### Customer APK Features
- ✅ Service booking
- ✅ Worker search
- ✅ Customer profile
- ✅ Reviews and ratings
- ✅ Payment processing
- ✅ Location services
- ✅ Notifications

#### Worker APK Features
- ✅ Booking management
- ✅ Worker profile
- ✅ Earnings tracking
- ✅ Schedule management
- ✅ Document upload
- ✅ Notifications

#### Shared Features (Both APKs)
- ✅ Authentication
- ✅ Messaging
- ✅ File upload
- ✅ Camera access

## Backend Integration

### Shared Backend Configuration
Both APKs use the same backend configuration defined in `constants/backend.ts`:

```typescript
import { getEndpoints, getFullUrl } from '@/constants/backend';

// Get appropriate endpoints for current app type
const endpoints = getEndpoints();

// Make API calls
const response = await fetch(getFullUrl(endpoints.LOGIN), {
  method: 'POST',
  headers: BACKEND_CONFIG.HEADERS,
  body: JSON.stringify(loginData)
});
```

### API Endpoints Structure
- **Shared Endpoints**: Authentication, user management, file upload, messaging
- **Customer Endpoints**: Worker search, booking, payments, location services
- **Worker Endpoints**: Booking management, earnings, schedule, documents

## Deployment

### EAS Build Profiles
The `eas.json` file contains three build profiles:
- `customer`: For customer APK builds
- `worker`: For worker APK builds
- `production`: Base configuration

### Environment Variables
Each build profile sets the `APP_TYPE` environment variable:
- Customer builds: `APP_TYPE=customer`
- Worker builds: `APP_TYPE=worker`

## Development Workflow

### 1. Feature Development
1. Develop features in the main codebase
2. Use feature flags to control availability
3. Test with both app types

### 2. Testing
1. Build both APKs locally for testing
2. Test customer features in customer APK
3. Test worker features in worker APK
4. Verify shared features work in both

### 3. Production Builds
1. Run `npm run build:both` to build both APKs
2. Download APKs from EAS dashboard
3. Deploy to respective app stores

## Troubleshooting

### Common Issues

1. **Build Fails**: Check EAS configuration and ensure you're logged in
2. **Feature Not Available**: Verify feature flags are correctly set
3. **Backend Connection**: Ensure backend URL is correct in `constants/backend.ts`

### Debug Commands
```bash
# Check current app type
console.log(Constants.expoConfig?.extra?.appType);

# Check feature availability
console.log(isFeatureEnabled('customerBooking'));

# Check available endpoints
console.log(getEndpoints());
```

## Customization

### Adding New Features
1. Add feature flag in `constants/features.ts`
2. Implement feature with conditional rendering
3. Add appropriate API endpoints in `constants/backend.ts`
4. Test in both APKs

### Modifying App Configuration
1. Update `app-customer.json` for customer APK changes
2. Update `app-worker.json` for worker APK changes
3. Rebuild APKs to apply changes

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review EAS documentation
3. Check feature flag configuration
4. Verify backend connectivity
