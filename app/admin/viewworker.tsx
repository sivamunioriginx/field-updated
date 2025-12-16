import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api';

// Construct base image URL from API base URL
const getImageBaseUrl = () => {
  return API_BASE_URL.replace('/api', '');
};

interface Worker {
  id: number;
  name: string;
  mobile: string;
  email: string;
  price: number;
  skill_id: string;
  category_title?: string;
  pincode: string;
  mandal: string;
  city: string;
  district: string;
  state: string;
  country: string;
  latitude: string;
  longitude: string;
  address: string;
  type: string;
  status: number;
  profile_image?: string;
  document1?: string;
  document2?: string;
  created_at: string;
}

interface ViewWorkerProps {
  workerId: number;
  onBack: () => void;
}

export default function ViewWorker({ workerId, onBack }: ViewWorkerProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkerDetails();
  }, [workerId]);

  const fetchWorkerDetails = async () => {
    try {
      setLoading(true);
      
      console.log('📡 Fetching worker details for ID:', workerId);
      const response = await fetch(`${API_ENDPOINTS.ADMIN_WORKERS}/${workerId}`);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        Alert.alert('Error', 'Failed to fetch worker details');
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('📦 Worker details response:', data);
      
      if (data.success) {
        setWorker(data.worker || data.data);
      } else {
        console.error('❌ Failed to fetch worker:', data.message);
        Alert.alert('Error', data.message || 'Failed to fetch worker details');
      }
    } catch (error) {
      console.error('❌ Error fetching worker details:', error);
      Alert.alert('Error', 'An error occurred while fetching worker details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: number) => {
    return status === 1 ? '#10b981' : '#ef4444';
  };

  const getStatusText = (status: number) => {
    return status === 1 ? 'Active' : 'Inactive';
  };

  const handleDownloadDocument = async (documentPath: string) => {
    try {
      // Extract filename from the full Windows path
      // "C:\Users\...\backend\uploads\document1-xxx.jpg" -> "document1-xxx.jpg"
      let filename = documentPath;
      if (documentPath.includes('\\')) {
        const parts = documentPath.split('\\');
        filename = parts[parts.length - 1];
      } else if (documentPath.includes('/')) {
        const parts = documentPath.split('/');
        filename = parts[parts.length - 1];
      }
      
      // Construct URL: http://192.168.31.84:3001/uploads/document1-xxx.jpg
      const documentUrl = `${getImageBaseUrl()}/uploads/${filename}`;
      console.log('Opening document:', documentUrl);
      
      const supported = await Linking.canOpenURL(documentUrl);
      if (supported) {
        await Linking.openURL(documentUrl);
      } else {
        Alert.alert('Error', 'Cannot open document URL');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const styles = createStyles(width, height);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading worker details...</Text>
      </View>
    );
  }

  if (!worker) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#cbd5e1" />
        </View>
        <Text style={styles.emptyTitle}>Worker Not Found</Text>
        <Text style={styles.emptyText}>The worker you're looking for doesn't exist.</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIconButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Worker Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Single Card with All Information */}
      <View style={styles.card}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {worker.profile_image ? (
              <Image 
                source={{ uri: `${getImageBaseUrl()}${worker.profile_image}` }} 
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={isDesktop ? 50 : isTablet ? 45 : 40} color="#10b981" />
              </View>
            )}
          </View>
          <Text style={styles.workerName}>{worker.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(worker.status) }]}>
            <Text style={styles.statusText}>{getStatusText(worker.status)}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />
        {/* Contact Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={20} color="#10b981" />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>
          <View style={styles.sectionContent}>
            <InfoRow icon="call" label="Mobile" value={worker.mobile} />
            <InfoRow icon="mail" label="Email" value={worker.email || 'N/A'} />
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Professional Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase-outline" size={20} color="#10b981" />
            <Text style={styles.sectionTitle}>Professional Information</Text>
          </View>
          <View style={styles.sectionContent}>
            <InfoRow icon="star" label="Category" value={worker.category_title || 'N/A'} />
            <InfoRow icon="cash" label="Price" value={worker.price ? `₹${worker.price}/Per Hour` : 'N/A'} />
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Location Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color="#10b981" />
            <Text style={styles.sectionTitle}>Location Information</Text>
          </View>
          <View style={styles.sectionContent}>
            <InfoRow icon="home" label="Address" value={worker.address || 'N/A'} />
            <InfoRow icon="business" label="Mandal" value={worker.mandal || 'N/A'} />
            <InfoRow icon="location" label="City" value={worker.city || 'N/A'} />
            <InfoRow icon="map" label="District" value={worker.district || 'N/A'} />
            <InfoRow icon="flag" label="State" value={worker.state || 'N/A'} />
            <InfoRow icon="globe" label="Country" value={worker.country || 'N/A'} />
            <InfoRow icon="pin" label="Pincode" value={worker.pincode || 'N/A'} />
          </View>
        </View>

        {/* Personal Documents Section */}
        {worker.document1 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={20} color="#10b981" />
                <Text style={styles.sectionTitle}>Personal Documents</Text>
              </View>
              <View style={styles.sectionContent}>
                {worker.document1.split(',').map((doc, index) => {
                  const trimmedDoc = doc.trim();
                  if (!trimmedDoc) return null;
                  return (
                    <View key={`personal-${index}`} style={styles.documentRow}>
                      <Ionicons name="document" size={20} color="#64748b" />
                      <Text style={styles.documentText}>Personal Document {index + 1}</Text>
                      <TouchableOpacity 
                        style={styles.viewButton}
                        onPress={() => handleDownloadDocument(trimmedDoc)}
                      >
                        <Text style={styles.viewButtonText}>View</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Professional Documents Section */}
        {worker.document2 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={20} color="#10b981" />
                <Text style={styles.sectionTitle}>Professional Documents</Text>
              </View>
              <View style={styles.sectionContent}>
                {worker.document2.split(',').map((doc, index) => {
                  const trimmedDoc = doc.trim();
                  if (!trimmedDoc) return null;
                  return (
                    <View key={`professional-${index}`} style={styles.documentRow}>
                      <Ionicons name="document" size={20} color="#64748b" />
                      <Text style={styles.documentText}>Professional Document {index + 1}</Text>
                      <TouchableOpacity 
                        style={styles.viewButton}
                        onPress={() => handleDownloadDocument(trimmedDoc)}
                      >
                        <Text style={styles.viewButtonText}>View</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

// Info Row Component
interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelContainer}>
        <Ionicons name={icon as any} size={16} color="#64748b" />
        <Text style={styles.infoLabel}>{label}:</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const createStyles = (width: number, height: number) => {
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    contentContainer: {
      padding: isDesktop ? 32 : isTablet ? 24 : 16,
      paddingBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
      backgroundColor: '#f8fafc',
    },
    loadingText: {
      marginTop: isDesktop ? 16 : isTablet ? 14 : 12,
      fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
      color: '#64748b',
      fontWeight: '500',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
      paddingHorizontal: 20,
      backgroundColor: '#f8fafc',
    },
    emptyIconContainer: {
      width: isDesktop ? 120 : isTablet ? 100 : 80,
      height: isDesktop ? 120 : isTablet ? 100 : 80,
      borderRadius: isDesktop ? 60 : isTablet ? 50 : 40,
      backgroundColor: '#ffffff',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isDesktop ? 24 : isTablet ? 20 : 16,
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderStyle: 'dashed',
    },
    emptyTitle: {
      fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 8,
    },
    emptyText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      color: '#64748b',
      textAlign: 'center',
      marginBottom: 24,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#10b981',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
      gap: 8,
    },
    backButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#ffffff',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: isDesktop ? 32 : isTablet ? 24 : 20,
    },
    backIconButton: {
      width: isDesktop ? 44 : 40,
      height: isDesktop ? 44 : 40,
      borderRadius: 12,
      backgroundColor: '#ffffff',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    headerTitle: {
      fontSize: isDesktop ? 28 : isTablet ? 24 : 20,
      fontWeight: '700',
      color: '#0f172a',
    },
    headerSpacer: {
      width: isDesktop ? 44 : 40,
    },
    profileSection: {
      alignItems: 'center',
      paddingVertical: isDesktop ? 8 : 6,
    },
    profileImageContainer: {
      marginBottom: 16,
    },
    profileImage: {
      width: isDesktop ? 100 : isTablet ? 90 : 80,
      height: isDesktop ? 100 : isTablet ? 90 : 80,
      borderRadius: isDesktop ? 50 : isTablet ? 45 : 40,
      borderWidth: 3,
      borderColor: '#10b981',
    },
    profileImagePlaceholder: {
      width: isDesktop ? 100 : isTablet ? 90 : 80,
      height: isDesktop ? 100 : isTablet ? 90 : 80,
      borderRadius: isDesktop ? 50 : isTablet ? 45 : 40,
      backgroundColor: '#d1fae5',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#10b981',
    },
    workerName: {
      fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: 10,
      textAlign: 'center',
    },
    statusBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
    },
    statusText: {
      fontSize: isDesktop ? 13 : 12,
      fontWeight: '600',
      color: '#ffffff',
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      padding: isDesktop ? 24 : isTablet ? 20 : 16,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    section: {
      paddingVertical: isDesktop ? 8 : 6,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: isDesktop ? 16 : isTablet ? 14 : 12,
    },
    sectionTitle: {
      fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
      fontWeight: '700',
      color: '#0f172a',
    },
    sectionContent: {
      gap: isDesktop ? 14 : isTablet ? 12 : 10,
    },
    divider: {
      height: 1,
      backgroundColor: '#e2e8f0',
      marginVertical: isDesktop ? 16 : isTablet ? 14 : 12,
    },
    infoRow: {
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? 4 : 12,
    },
    infoLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: isMobile ? undefined : isDesktop ? 200 : 160,
    },
    infoLabel: {
      fontSize: isDesktop ? 14 : 13,
      fontWeight: '600',
      color: '#64748b',
    },
    infoValue: {
      fontSize: isDesktop ? 15 : 14,
      fontWeight: '500',
      color: '#0f172a',
      flex: 1,
    },
    documentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      backgroundColor: '#f8fafc',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    documentText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: '#0f172a',
    },
    viewButton: {
      backgroundColor: '#10b981',
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 6,
    },
    viewButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#ffffff',
    },
  });
};

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 160,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
    flex: 1,
  },
});
