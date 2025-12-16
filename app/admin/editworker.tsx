import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

interface Category {
  id: number;
  title: string;
  image: string;
}

interface EditWorkerProps {
  workerId: number;
  onBack: () => void;
  onSave?: () => void;
}

export default function EditWorker({ workerId, onBack, onSave }: EditWorkerProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [price, setPrice] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [mandal, setMandal] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  
  // Skills/Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  
  // Documents
  const [personalDocuments, setPersonalDocuments] = useState<any[]>([]);
  const [professionalDocuments, setProfessionalDocuments] = useState<any[]>([]);
  const [existingPersonalDocs, setExistingPersonalDocs] = useState<string[]>([]);
  const [existingProfessionalDocs, setExistingProfessionalDocs] = useState<string[]>([]);
  
  // Track initial values for change detection
  const [initialData, setInitialData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchWorkerDetails();
    fetchCategories();
  }, [workerId]);

  // Check for changes
  useEffect(() => {
    if (!initialData) {
      setHasChanges(false);
      return;
    }

    const arraysEqual = (arr1: any[], arr2: any[]) => {
      if (arr1.length !== arr2.length) return false;
      const sorted1 = [...arr1].sort();
      const sorted2 = [...arr2].sort();
      return sorted1.every((val, idx) => val === sorted2[idx]);
    };

    const changed = 
      name !== initialData.name ||
      mobile !== initialData.mobile ||
      email !== initialData.email ||
      price !== initialData.price ||
      pincode !== initialData.pincode ||
      address !== initialData.address ||
      mandal !== initialData.mandal ||
      city !== initialData.city ||
      district !== initialData.district ||
      state !== initialData.state ||
      country !== initialData.country ||
      !arraysEqual(selectedSkills, initialData.selectedSkills) ||
      !arraysEqual(existingPersonalDocs, initialData.existingPersonalDocs) ||
      !arraysEqual(existingProfessionalDocs, initialData.existingProfessionalDocs) ||
      personalDocuments.length > 0 ||
      professionalDocuments.length > 0;

    setHasChanges(changed);
  }, [
    name, mobile, email, price, pincode, address, mandal, city, district, state, country,
    selectedSkills, existingPersonalDocs, existingProfessionalDocs,
    personalDocuments, professionalDocuments, initialData
  ]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIES);
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories || data.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
    }
  };

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
        const workerData = data.worker || data.data;
        setWorker(workerData);
        
        // Populate form fields
        setName(workerData.name || '');
        setMobile(workerData.mobile || '');
        setEmail(workerData.email || '');
        setPrice(workerData.price?.toString() || '');
        setPincode(workerData.pincode || '');
        setAddress(workerData.address || '');
        setMandal(workerData.mandal || '');
        setCity(workerData.city || '');
        setDistrict(workerData.district || '');
        setState(workerData.state || '');
        setCountry(workerData.country || '');
        
        // Parse existing skills
        let skillIds: number[] = [];
        if (workerData.skill_id) {
          skillIds = workerData.skill_id.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
          setSelectedSkills(skillIds);
        }
        
        // Parse existing documents
        let personalDocs: string[] = [];
        let professionalDocs: string[] = [];
        if (workerData.document1) {
          personalDocs = workerData.document1.split(',').filter((doc: string) => doc.trim());
          setExistingPersonalDocs(personalDocs);
        }
        if (workerData.document2) {
          professionalDocs = workerData.document2.split(',').filter((doc: string) => doc.trim());
          setExistingProfessionalDocs(professionalDocs);
        }
        
        // Store initial values
        setInitialData({
          name: workerData.name || '',
          mobile: workerData.mobile || '',
          email: workerData.email || '',
          price: workerData.price?.toString() || '',
          pincode: workerData.pincode || '',
          address: workerData.address || '',
          mandal: workerData.mandal || '',
          city: workerData.city || '',
          district: workerData.district || '',
          state: workerData.state || '',
          country: workerData.country || '',
          selectedSkills: skillIds,
          existingPersonalDocs: personalDocs,
          existingProfessionalDocs: professionalDocs,
        });
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

  const toggleSkill = (skillId: number) => {
    if (selectedSkills.includes(skillId)) {
      setSelectedSkills(selectedSkills.filter(id => id !== skillId));
    } else {
      setSelectedSkills([...selectedSkills, skillId]);
    }
  };

  const handlePickPersonalDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        setPersonalDocuments([...personalDocuments, ...result.assets]);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
    }
  };

  const handlePickProfessionalDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        setProfessionalDocuments([...professionalDocuments, ...result.assets]);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
    }
  };

  const removePersonalDocument = (index: number) => {
    setPersonalDocuments(personalDocuments.filter((_, i) => i !== index));
  };

  const removeProfessionalDocument = (index: number) => {
    setProfessionalDocuments(professionalDocuments.filter((_, i) => i !== index));
  };

  const removeExistingPersonalDoc = (index: number) => {
    setExistingPersonalDocs(existingPersonalDocs.filter((_, i) => i !== index));
  };

  const removeExistingProfessionalDoc = (index: number) => {
    setExistingProfessionalDocs(existingProfessionalDocs.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Validate required fields
    if (!name.trim() || !mobile.trim()) {
      Alert.alert('Validation Error', 'Name and Mobile are required fields');
      return;
    }

    if (selectedSkills.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one skill');
      return;
    }

    try {
      setSaving(true);
      
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('mobile', mobile.trim());
      formData.append('email', email.trim());
      formData.append('price', price || '0');
      formData.append('skills', JSON.stringify(selectedSkills));
      formData.append('pincode', pincode.trim());
      formData.append('address', address.trim());
      formData.append('mandal', mandal.trim());
      formData.append('city', city.trim());
      formData.append('district', district.trim());
      formData.append('state', state.trim());
      formData.append('country', country.trim());

      // Add existing documents (only those that weren't removed)
      if (existingPersonalDocs.length > 0) {
        formData.append('existingPersonalDocuments', JSON.stringify(existingPersonalDocs));
      }
      if (existingProfessionalDocs.length > 0) {
        formData.append('existingProfessionalDocuments', JSON.stringify(existingProfessionalDocs));
      }

      // Add new personal documents
      personalDocuments.forEach((doc) => {
        formData.append('document1', {
          uri: doc.uri,
          name: doc.name,
          type: doc.mimeType || 'application/octet-stream',
        } as any);
      });

      // Add new professional documents
      professionalDocuments.forEach((doc) => {
        formData.append('document2', {
          uri: doc.uri,
          name: doc.name,
          type: doc.mimeType || 'application/octet-stream',
        } as any);
      });

      console.log('📤 Updating worker...');
      
      const response = await fetch(`${API_ENDPOINTS.ADMIN_WORKERS}/${workerId}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();
      console.log('📦 Update response:', data);

      if (data.success) {
        Alert.alert('Success', 'Worker updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              if (onSave) onSave();
              onBack();
            }
          }
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to update worker');
      }
    } catch (error) {
      console.error('❌ Error updating worker:', error);
      Alert.alert('Error', 'An error occurred while updating worker');
    } finally {
      setSaving(false);
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
        <Text style={styles.headerTitle}>Edit Worker</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Form Card */}
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
            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter name"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Mobile *</Text>
                <TextInput
                  style={styles.input}
                  value={mobile}
                  onChangeText={setMobile}
                  placeholder="Enter mobile number"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Price (₹/Per Hour)</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="Enter price"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />
              </View>
            </View>
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
            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Skills *</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setShowSkillsDropdown(!showSkillsDropdown)}
                >
                  <Text style={styles.dropdownButtonText} numberOfLines={1}>
                    {selectedSkills.length > 0 
                      ? categories
                          .filter(cat => selectedSkills.includes(cat.id))
                          .map(cat => cat.title)
                          .join(', ')
                      : 'Select skills'
                    }
                  </Text>
                  <Ionicons 
                    name={showSkillsDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
                {showSkillsDropdown && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={styles.dropdownItem}
                          onPress={() => toggleSkill(category.id)}
                        >
                          <View style={[
                            styles.checkbox,
                            selectedSkills.includes(category.id) && styles.checkboxChecked
                          ]}>
                            {selectedSkills.includes(category.id) && (
                              <Ionicons name="checkmark" size={16} color="#ffffff" />
                            )}
                          </View>
                          <Text style={styles.dropdownItemText}>{category.title}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              <View style={styles.inputGroupHalf} />
            </View>
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
            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Mandal</Text>
                <TextInput
                  style={styles.input}
                  value={mandal}
                  onChangeText={setMandal}
                  placeholder="Enter mandal"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter city"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>District</Text>
                <TextInput
                  style={styles.input}
                  value={district}
                  onChangeText={setDistrict}
                  placeholder="Enter district"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>State</Text>
                <TextInput
                  style={styles.input}
                  value={state}
                  onChangeText={setState}
                  placeholder="Enter state"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Country</Text>
                <TextInput
                  style={styles.input}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="Enter country"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Pincode</Text>
                <TextInput
                  style={styles.input}
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="Enter pincode"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter address"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.inputGroupHalf} />
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Documents Section - Two Columns */}
        <View style={styles.documentsRow}>
          {/* Personal Documents Section */}
          <View style={styles.documentSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color="#10b981" />
              <Text style={styles.sectionTitle}>Personal Documents</Text>
            </View>
            <View style={styles.sectionContent}>
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handlePickPersonalDocuments}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#10b981" />
                <Text style={styles.uploadButtonText}>Upload</Text>
              </TouchableOpacity>
              {existingPersonalDocs.map((doc, index) => {
                const fileName = doc.split('/').pop() || doc.split('\\').pop() || doc;
                return (
                  <View key={`existing-${index}`} style={styles.documentItem}>
                    <Ionicons name="document" size={18} color="#10b981" />
                    <Text style={styles.documentName} numberOfLines={1}>{fileName}</Text>
                    <View style={styles.existingBadge}>
                      <Text style={styles.existingBadgeText}>Existing</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeExistingPersonalDoc(index)}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {personalDocuments.map((doc, index) => (
                <View key={`new-${index}`} style={styles.documentItem}>
                  <Ionicons name="document" size={18} color="#64748b" />
                  <Text style={styles.documentName} numberOfLines={1}>{doc.name}</Text>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                  <TouchableOpacity onPress={() => removePersonalDocument(index)}>
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Professional Documents Section */}
          <View style={styles.documentSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color="#10b981" />
              <Text style={styles.sectionTitle}>Professional Documents</Text>
            </View>
            <View style={styles.sectionContent}>
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={handlePickProfessionalDocuments}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#10b981" />
                <Text style={styles.uploadButtonText}>Upload</Text>
              </TouchableOpacity>
              {existingProfessionalDocs.map((doc, index) => {
                const fileName = doc.split('/').pop() || doc.split('\\').pop() || doc;
                return (
                  <View key={`existing-${index}`} style={styles.documentItem}>
                    <Ionicons name="document" size={18} color="#10b981" />
                    <Text style={styles.documentName} numberOfLines={1}>{fileName}</Text>
                    <View style={styles.existingBadge}>
                      <Text style={styles.existingBadgeText}>Existing</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeExistingProfessionalDoc(index)}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {professionalDocuments.map((doc, index) => (
                <View key={`new-${index}`} style={styles.documentItem}>
                  <Ionicons name="document" size={18} color="#64748b" />
                  <Text style={styles.documentName} numberOfLines={1}>{doc.name}</Text>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeProfessionalDocument(index)}>
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={[
            styles.updateButton,
            (!hasChanges || saving) && styles.updateButtonDisabled
          ]} 
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#ffffff" />
              <Text style={styles.updateButtonText}>Update</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    profileSection: {
      alignItems: 'center',
      paddingVertical: isDesktop ? 8 : 6,
    },
    profileImageContainer: {
      marginBottom: 12,
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
    inputGroup: {
      gap: 6,
    },
    inputLabel: {
      fontSize: isDesktop ? 14 : 13,
      fontWeight: '600',
      color: '#0f172a',
    },
    input: {
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: isDesktop ? 15 : 14,
      color: '#0f172a',
      fontWeight: '500',
    },
    inputMultiline: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    inputDisabled: {
      backgroundColor: '#f1f5f9',
      color: '#64748b',
    },
    inputRow: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isDesktop ? 14 : isTablet ? 12 : 10,
    },
    inputGroupHalf: {
      flex: 1,
      gap: 6,
    },
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    dropdownButtonText: {
      fontSize: isDesktop ? 15 : 14,
      color: '#0f172a',
      fontWeight: '500',
    },
    dropdownMenu: {
      marginTop: 8,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 10,
      maxHeight: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    dropdownScroll: {
      maxHeight: 200,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      gap: 10,
    },
    dropdownItemText: {
      fontSize: isDesktop ? 14 : 13,
      color: '#0f172a',
      fontWeight: '500',
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: '#10b981',
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
    },
    checkboxChecked: {
      backgroundColor: '#10b981',
      borderColor: '#10b981',
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#10b981',
      borderStyle: 'dashed',
      backgroundColor: '#f0fdf4',
    },
    uploadButtonText: {
      fontSize: isDesktop ? 13 : 12,
      fontWeight: '600',
      color: '#10b981',
    },
    documentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 8,
      backgroundColor: '#f8fafc',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    documentName: {
      flex: 1,
      fontSize: isDesktop ? 12 : 11,
      color: '#0f172a',
      fontWeight: '500',
    },
    existingBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: '#dbeafe',
      borderRadius: 3,
    },
    existingBadgeText: {
      fontSize: 9,
      fontWeight: '600',
      color: '#1e40af',
    },
    newBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: '#d1fae5',
      borderRadius: 3,
    },
    newBadgeText: {
      fontSize: 9,
      fontWeight: '600',
      color: '#065f46',
    },
    documentsRow: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isDesktop ? 14 : isTablet ? 12 : 10,
      paddingVertical: isDesktop ? 8 : 6,
    },
    documentSection: {
      flex: 1,
    },
    updateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 8,
      backgroundColor: '#10b981',
      marginTop: isDesktop ? 24 : isTablet ? 20 : 16,
      alignSelf: 'center',
      minWidth: 120,
    },
    updateButtonDisabled: {
      backgroundColor: '#94a3b8',
      opacity: 0.6,
    },
    updateButtonText: {
      fontSize: isDesktop ? 14 : 13,
      fontWeight: '600',
      color: '#ffffff',
    },
  });
};
