import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import Toast from 'react-native-toast-message';
import { API_ENDPOINTS, BASE_URL } from '../../constants/api';

interface Animation {
  id: number;
  event_name: string;
  animation_name: string;
  video_url?: string;
  is_active: boolean | number;
  status?: number;
  created_at: string;
}

interface AnimationsProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Animations({ searchQuery: externalSearchQuery, onSearchChange }: AnimationsProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'ALL'>(5);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showRecordsDropdown, setShowRecordsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnimationId, setEditingAnimationId] = useState<number | null>(null);
  const [eventName, setEventName] = useState('');
  const [animationVideo, setAnimationVideo] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [animationToDelete, setAnimationToDelete] = useState<{ id: number; name: string } | null>(null);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [animationToActivate, setAnimationToActivate] = useState<{ id: number; name: string } | null>(null);

  // Sync external search query if provided
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchAnimations = async () => {
    try {
      setLoading(true);
      
      console.log('📡 Fetching animations from:', API_ENDPOINTS.ADMIN_ANIMATIONS);
      const response = await fetch(API_ENDPOINTS.ADMIN_ANIMATIONS);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        setAnimations([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('📦 Animations response:', data);
      
      if (data.success) {
        const animationsData = data.animations || data.data || [];
        console.log('✅ Animations fetched:', animationsData.length, 'records');
        // Map database fields to frontend interface
        const mappedAnimations = animationsData.map((anim: any) => ({
          id: anim.id,
          event_name: anim.name,
          animation_name: anim.video_title,
          video_url: anim.video_title,
          is_active: anim.status === 1,
          status: anim.status,
          created_at: anim.created_at
        }));
        setAnimations(mappedAnimations);
      } else {
        console.error('❌ Failed to fetch animations:', data.message);
        setAnimations([]);
      }
    } catch (error) {
      console.error('❌ Error fetching animations:', error);
      setAnimations([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnimations();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAnimations();
  }, []);

  // Filter and sort animations
  const getFilteredAndSortedAnimations = () => {
    let filtered = [...animations];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(animation => 
        animation.event_name.toLowerCase().includes(query) ||
        (animation.animation_name && animation.animation_name.toLowerCase().includes(query)) ||
        (animation.created_at && animation.created_at.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'desc':
          return b.id - a.id;
        case 'asc':
          return a.id - b.id;
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Pagination logic
  const getPaginatedAnimations = () => {
    const filtered = getFilteredAndSortedAnimations();
    if (recordsPerPage === 'ALL') {
      return filtered;
    }
    const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filtered.slice(startIndex, endIndex);
  };

  const totalPages = recordsPerPage === 'ALL' 
    ? 1 
    : Math.ceil(getFilteredAndSortedAnimations().length / (typeof recordsPerPage === 'number' ? recordsPerPage : 10));

  const sortOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];

  const recordOptions = [5, 10, 50, 100, 'ALL'];

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(1);
    if (onSearchChange) {
      onSearchChange(text);
    }
  };

  const handleAddAnimation = () => {
    setEditingAnimationId(null);
    setEventName('');
    setAnimationVideo(null);
    setVideoError('');
    setIsActive(false);
    setShowAddModal(true);
  };

  const handleEdit = (animationId: number) => {
    const animation = animations.find(anim => anim.id === animationId);
    if (animation) {
      setEditingAnimationId(animationId);
      setEventName(animation.event_name);
      // Construct video URL if exists
      let videoUrl = animation.video_url;
      if (videoUrl && !videoUrl.startsWith('http')) {
        videoUrl = `${BASE_URL}/uploads/animations/${videoUrl}`;
      }
      setAnimationVideo(videoUrl || null);
      setVideoError('');
      setIsActive(!!animation.is_active);
      setShowAddModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingAnimationId(null);
    setEventName('');
    setAnimationVideo(null);
    setVideoError('');
    setIsActive(false);
  };

  const handleVideoUpload = async () => {
    try {
      // Request permission for media library access
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Validate file size (20 MB = 20 * 1024 * 1024 bytes)
        const maxSize = 20 * 1024 * 1024;
        if (asset.fileSize && asset.fileSize > maxSize) {
          setVideoError('Video size must be less than 20 MB');
          setAnimationVideo(null);
          return;
        }

        // Validate video type
        const uri = asset.uri.toLowerCase();
        const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
        const isValidVideo = validExtensions.some(ext => uri.endsWith(ext));
        
        if (!isValidVideo && asset.type !== 'video') {
          setVideoError('Please select a valid video file');
          setAnimationVideo(null);
          return;
        }

        setVideoError('');
        setAnimationVideo(asset.uri);
        console.log('📹 Video selected:', {
          uri: asset.uri,
          type: asset.type,
          duration: asset.duration,
          fileSize: asset.fileSize,
          fileName: asset.fileName
        });
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const handleSubmitAnimation = async () => {
    // Validation
    if (!eventName.trim()) {
      Alert.alert('Validation Error', 'Please enter event name');
      return;
    }

    if (!editingAnimationId && !animationVideo) {
      Alert.alert('Validation Error', 'Please upload animation video');
      return;
    }

    if (videoError) {
      Alert.alert('Validation Error', videoError);
      return;
    }

    try {
      setLoading(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('event_name', eventName.trim());
      formData.append('is_active', isActive ? '1' : '0');

      // Add video file - only if it's a new upload
      const isEditMode = editingAnimationId !== null;
      const isNewVideo = animationVideo && (
        animationVideo.startsWith('blob:') || 
        animationVideo.startsWith('data:') || 
        animationVideo.startsWith('file://') ||
        !animationVideo.startsWith('http')
      );

      if (animationVideo && (!isEditMode || isNewVideo)) {
        // Extract file extension from URI
        const uriParts = animationVideo.split('.');
        const fileExtension = uriParts.length > 1 ? uriParts[uriParts.length - 1].toLowerCase() : 'mp4';
        const fileName = `animation_${Date.now()}.${fileExtension}`;
        
        // Determine MIME type based on extension
        let mimeType = 'video/mp4';
        if (fileExtension === 'mov') {
          mimeType = 'video/quicktime';
        } else if (fileExtension === 'avi') {
          mimeType = 'video/x-msvideo';
        } else if (fileExtension === 'mkv') {
          mimeType = 'video/x-matroska';
        } else if (fileExtension === 'webm') {
          mimeType = 'video/webm';
        }

        console.log('📤 Uploading video:', {
          uri: animationVideo,
          name: fileName,
          type: mimeType,
          isEditMode: isEditMode,
          isNewVideo: isNewVideo
        });

        // Check if running on web platform
        const isWeb = typeof window !== 'undefined';

        if (isWeb) {
          try {
            if (animationVideo.startsWith('blob:') || animationVideo.startsWith('data:')) {
              const response = await fetch(animationVideo);
              const blob = await response.blob();
              const file = new File([blob], fileName, { type: mimeType });
              formData.append('animationVideo', file);
              console.log('✅ Web: Converted blob/data URL to File');
            } else if (!animationVideo.startsWith('http')) {
              const response = await fetch(animationVideo);
              const blob = await response.blob();
              const file = new File([blob], fileName, { type: mimeType });
              formData.append('animationVideo', file);
              console.log('✅ Web: Converted local file to File');
            }
          } catch (error) {
            console.error('❌ Error converting video to file:', error);
            formData.append('animationVideo', {
              uri: animationVideo,
              name: fileName,
              type: mimeType,
            } as any);
            console.log('⚠️ Web: Using fallback React Native format');
          }
        } else {
          // React Native FormData format
          formData.append('animationVideo', {
            uri: animationVideo,
            name: fileName,
            type: mimeType,
          } as any);
          console.log('✅ React Native: File appended to FormData');
        }
      }

      // Determine endpoint and method
      const endpoint = isEditMode 
        ? `${API_ENDPOINTS.ADMIN_ANIMATIONS}/${editingAnimationId}`
        : API_ENDPOINTS.ADMIN_ANIMATIONS;
      const method = isEditMode ? 'PUT' : 'POST';

      console.log('📤 Submitting animation:', { endpoint, method, isEditMode });

      const response = await fetch(endpoint, {
        method: method,
        body: formData,
      });

      const data = await response.json();
      console.log('📦 Response:', data);

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: isEditMode ? 'Animation Updated Successfully' : 'New Animation Created Successfully',
        });
        await fetchAnimations();
        handleCloseModal();
      } else {
        Alert.alert('Error', data.message || `Failed to ${isEditMode ? 'update' : 'create'} animation`);
      }
    } catch (error) {
      console.error('❌ Error saving animation:', error);
      Alert.alert('Error', 'Failed to save animation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (animationId: number) => {
    const animation = animations.find(anim => anim.id === animationId);
    if (animation) {
      setAnimationToDelete({ id: animationId, name: animation.event_name });
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!animationToDelete) return;

    try {
      setLoading(true);
      const animation = animations.find(anim => anim.id === animationToDelete.id);
      if (!animation) {
        Alert.alert('Error', 'Animation not found');
        return;
      }

      const formData = new FormData();
      formData.append('event_name', animation.event_name);
      formData.append('is_active', '0');

      const response = await fetch(`${API_ENDPOINTS.ADMIN_ANIMATIONS}/${animationToDelete.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Animation Inactivated Successfully',
        });
        await fetchAnimations();
        setShowDeleteModal(false);
        setAnimationToDelete(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to inactivate animation');
      }
    } catch (error) {
      console.error('❌ Error inactivating animation:', error);
      Alert.alert('Error', 'Failed to inactivate animation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setAnimationToDelete(null);
  };

  const handleActivate = (animationId: number) => {
    const animation = animations.find(anim => anim.id === animationId);
    if (animation) {
      setAnimationToActivate({ id: animationId, name: animation.event_name });
      setShowActivateModal(true);
    }
  };

  const handleConfirmActivate = async () => {
    if (!animationToActivate) return;

    try {
      setLoading(true);
      const animation = animations.find(anim => anim.id === animationToActivate.id);
      if (!animation) {
        Alert.alert('Error', 'Animation not found');
        return;
      }

      const formData = new FormData();
      formData.append('event_name', animation.event_name);
      formData.append('is_active', '1');

      const response = await fetch(`${API_ENDPOINTS.ADMIN_ANIMATIONS}/${animationToActivate.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Animation Activated Successfully',
        });
        await fetchAnimations();
        setShowActivateModal(false);
        setAnimationToActivate(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to activate animation');
      }
    } catch (error) {
      console.error('❌ Error activating animation:', error);
      Alert.alert('Error', 'Failed to activate animation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelActivate = () => {
    setShowActivateModal(false);
    setAnimationToActivate(null);
  };

  const toggleActiveStatus = async (animation: Animation) => {
    try {
      const newStatus = !animation.is_active;
      
      const formData = new FormData();
      formData.append('event_name', animation.event_name);
      formData.append('is_active', newStatus ? '1' : '0');

      const response = await fetch(`${API_ENDPOINTS.ADMIN_ANIMATIONS}/${animation.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: newStatus ? 'Animation Activated Successfully' : 'Animation Deactivated Successfully',
        });
        await fetchAnimations();
      } else {
        Alert.alert('Error', data.message || 'Failed to update animation status');
      }
    } catch (error) {
      console.error('Error toggling animation status:', error);
      Alert.alert('Error', 'Failed to update animation status. Please try again.');
    }
  };

  const styles = createStyles(width, height);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading Animations...</Text>
      </View>
    );
  }

  const filteredAnimations = getFilteredAndSortedAnimations();
  const paginatedAnimations = getPaginatedAnimations();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        scrollEnabled={true}
        bounces={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8b5cf6']} />
        }
      >
        <View style={styles.customersContainer}>
          <View style={styles.customersHeader}>
            <Text style={styles.customersTitle}>
              Animations
            </Text>
          </View>

          <View style={styles.tableWrapper}>
            <View style={styles.tableControlsRow}>
              {/* Add Animation, Sort and Records - aligned with table header */}
              <View style={styles.controlsRight}>
                {/* Add Animation Button */}
                <View style={styles.addButtonWrapper}>
                  <View style={styles.labelSpacer} />
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={handleAddAnimation}
                  >
                    <Ionicons name="add" size={isDesktop ? 18 : 16} color="#ffffff" />
                    <Text style={styles.addButtonText}>Add Animation</Text>
                  </TouchableOpacity>
                </View>

                {/* Sort Dropdown */}
                <View style={styles.dropdownWrapperSort}>
                  <Text style={styles.dropdownLabel}>Sort By:</Text>
                  <TouchableOpacity 
                    style={styles.dropdownButtonSort}
                    onPress={() => {
                      setShowSortDropdown(!showSortDropdown);
                      setShowRecordsDropdown(false);
                    }}
                  >
                    <Ionicons name="swap-vertical" size={isDesktop ? 16 : 14} color="#64748b" />
                    <Text style={styles.dropdownButtonText}>
                      {sortOptions.find(opt => opt.value === sortBy)?.label}
                    </Text>
                    <Ionicons 
                      name={showSortDropdown ? "chevron-up" : "chevron-down"} 
                      size={isDesktop ? 16 : 14} 
                      color="#64748b" 
                    />
                  </TouchableOpacity>
                  {showSortDropdown && (
                    <View style={styles.dropdownMenu}>
                      {sortOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.dropdownMenuItem,
                            sortBy === option.value && styles.dropdownMenuItemActive
                          ]}
                          onPress={() => {
                            setSortBy(option.value);
                            setShowSortDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownMenuItemText,
                            sortBy === option.value && styles.dropdownMenuItemTextActive
                          ]}>
                            {option.label}
                          </Text>
                          {sortBy === option.value && (
                            <Ionicons name="checkmark" size={16} color="#8b5cf6" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Records Per Page Dropdown */}
                <View style={styles.dropdownWrapperShow}>
                  <Text style={styles.dropdownLabel}>Show:</Text>
                  <TouchableOpacity 
                    style={styles.dropdownButtonShow}
                    onPress={() => {
                      setShowRecordsDropdown(!showRecordsDropdown);
                      setShowSortDropdown(false);
                    }}
                  >
                    <Ionicons name="list" size={isDesktop ? 14 : 12} color="#64748b" />
                    <Text style={styles.dropdownButtonTextShow}>
                      {recordsPerPage === 'ALL' ? 'ALL' : recordsPerPage}
                    </Text>
                    <Ionicons 
                      name={showRecordsDropdown ? "chevron-up" : "chevron-down"} 
                      size={isDesktop ? 14 : 12} 
                      color="#64748b" 
                    />
                  </TouchableOpacity>
                  {showRecordsDropdown && (
                    <View style={styles.dropdownMenuShow}>
                      {recordOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={[
                            styles.dropdownMenuItem,
                            recordsPerPage === option && styles.dropdownMenuItemActive
                          ]}
                          onPress={() => {
                            setRecordsPerPage(option as number | 'ALL');
                            setCurrentPage(1);
                            setShowRecordsDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownMenuItemText,
                            recordsPerPage === option && styles.dropdownMenuItemTextActive
                          ]}>
                            {option === 'ALL' ? 'ALL' : option}
                          </Text>
                          {recordsPerPage === option && (
                            <Ionicons name="checkmark" size={16} color="#10b981" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true} 
              style={styles.tableScrollView}
              persistentScrollbar={true}
              nestedScrollEnabled={true}
            >
              <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                    <Ionicons name="list" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>S NO</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 200 : isTablet ? 100 : 50 }]}>
                    <Ionicons name="gift-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Event Name</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 250 : isTablet ? 70 : 35 }]}>
                    <Ionicons name="film-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Animation Name</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 220 : isTablet ? 100 : 80 }]}>
                    <Ionicons name="settings" size={isDesktop ? 16 : 14} color="#ffffff" />
                    <Text style={styles.tableHeaderText}>Action</Text>
                  </View>
                </View>

                {/* Table Body */}
                {paginatedAnimations.length > 0 ? (
                  paginatedAnimations.map((animation, index) => {
                    const serialNumber = recordsPerPage === 'ALL' 
                      ? index + 1 
                      : (currentPage - 1) * (typeof recordsPerPage === 'number' ? recordsPerPage : 10) + index + 1;
                    return (
                      <View 
                        key={animation.id} 
                        style={[
                          styles.tableRow,
                          index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                        ]}
                      >
                        <View style={[styles.tableCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                          <Text style={styles.tableCellText}>{serialNumber}</Text>
                        </View>
                        <View style={[styles.tableCell, { width: isDesktop ? 200 : isTablet ? 100 : 50 }]}>
                          <Text style={styles.tableCellText}>{animation.event_name || 'N/A'}</Text>
                        </View>
                        <View style={[styles.tableCell, { width: isDesktop ? 250 : isTablet ? 70 : 35 }]}>
                          <Text style={styles.tableCellText}>{animation.animation_name || 'N/A'}</Text>
                        </View>
                        <View style={[styles.tableCell, styles.actionCell, { width: isDesktop ? 220 : isTablet ? 100 : 80 }]}>
                          <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={() => handleEdit(animation.id)}
                          >
                            <Ionicons name="create-outline" size={isDesktop ? 18 : 16} color="#8b5cf6" />
                          </TouchableOpacity>
                          {(animation.status === 0) ? (
                            <TouchableOpacity 
                              style={styles.actionButton}
                              onPress={() => handleActivate(animation.id)}
                            >
                              <Ionicons name="checkmark-circle-outline" size={isDesktop ? 18 : 16} color="#10b981" />
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity 
                              style={styles.actionButton}
                              onPress={() => handleDelete(animation.id)}
                            >
                              <Ionicons name="trash-outline" size={isDesktop ? 18 : 16} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyTableRow}>
                    <Text style={styles.emptyTableText}>No animations found</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>

          {/* Pagination Controls */}
          {animations.length > 0 && (
            <View style={styles.paginationContainer}>
              <Text style={styles.paginationInfo}>
                {recordsPerPage === 'ALL' 
                  ? `Showing all ${filteredAnimations.length} entries`
                  : (() => {
                      const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
                      const start = ((currentPage - 1) * pageSize) + 1;
                      const end = Math.min(currentPage * pageSize, filteredAnimations.length);
                      return `Showing ${start} to ${end} of ${filteredAnimations.length} entries`;
                    })()
                }
              </Text>
              
              <View style={styles.paginationButtons}>
                <TouchableOpacity 
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <Ionicons name="play-back" size={isDesktop ? 16 : 14} color={currentPage === 1 ? '#cbd5e1' : '#64748b'} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <Ionicons name="chevron-back" size={isDesktop ? 16 : 14} color={currentPage === 1 ? '#cbd5e1' : '#64748b'} />
                </TouchableOpacity>

                <Text style={styles.paginationText}>
                  Page {currentPage} of {totalPages || 1}
                </Text>

                <TouchableOpacity 
                  style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <Ionicons name="chevron-forward" size={isDesktop ? 16 : 14} color={currentPage === totalPages ? '#cbd5e1' : '#64748b'} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
                  onPress={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <Ionicons name="play-forward" size={isDesktop ? 16 : 14} color={currentPage === totalPages ? '#cbd5e1' : '#64748b'} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <View style={styles.deleteIconCircle}>
                <Ionicons name="trash" size={isDesktop ? 32 : 28} color="#ef4444" />
              </View>
            </View>
            <Text style={styles.deleteModalTitle}>Inactive Animation?</Text>
            <Text style={styles.deleteModalText}>
              Are You Sure You Want to Inactive The {animationToDelete?.name || 'Animation'}?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={handleCancelDelete}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleConfirmDelete}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>Inactive</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Activate Confirmation Modal */}
      <Modal
        visible={showActivateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelActivate}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteIconContainer}>
              <View style={styles.activateIconCircle}>
                <Ionicons name="checkmark-circle" size={isDesktop ? 32 : 28} color="#10b981" />
              </View>
            </View>
            <Text style={styles.deleteModalTitle}>Make Active?</Text>
            <Text style={styles.deleteModalText}>
              Are You Sure You Want to Make Active The {animationToActivate?.name || 'Animation'}?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={handleCancelActivate}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.activateConfirmButton}
                onPress={handleConfirmActivate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.activateConfirmButtonText}>Active</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Animation Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAnimationId ? 'Edit Animation' : 'Add New Animation'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Event Name */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Event Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter event name"
                  placeholderTextColor="#94a3b8"
                  value={eventName}
                  onChangeText={setEventName}
                />
              </View>

              {/* Upload Video */}
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Upload Video</Text>
                <TouchableOpacity
                  style={styles.videoUploadInput}
                  onPress={handleVideoUpload}
                >
                  <Text style={styles.videoUploadInputText}>
                    {animationVideo ? 'Video Selected' : 'Tap to upload video'}
                  </Text>
                  <Ionicons name="cloud-upload-outline" size={20} color="#8b5cf6" />
                </TouchableOpacity>
                {videoError ? (
                  <Text style={styles.videoErrorText}>{videoError}</Text>
                ) : null}
                {animationVideo && !videoError && (
                  <View style={styles.videoPreviewContainer}>
                    <View style={styles.videoInfoContainer}>
                      <Ionicons name="videocam" size={24} color="#8b5cf6" />
                      <Text style={styles.videoInfoText}>Video ready to upload</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeVideoButton}
                      onPress={() => {
                        setAnimationVideo(null);
                        setVideoError('');
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={styles.videoHintText}>Max size: 20 MB. Supported formats: MP4, MOV, AVI, MKV, WEBM</Text>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCloseModal}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitButton, 
                  loading && styles.modalSubmitButtonDisabled
                ]}
                onPress={handleSubmitAnimation}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    },
    loadingText: {
      marginTop: isDesktop ? 16 : isTablet ? 14 : 12,
      fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
      color: '#64748b',
      fontWeight: '500',
    },
    customersContainer: {
      width: '100%',
    },
    customersHeader: {
      marginBottom: -20,
      zIndex: 500,
      overflow: 'visible',
    },
    customersTitle: {
      fontSize: isDesktop ? 24 : isTablet ? 20 : 18,
      fontWeight: '700',
      color: '#0f172a',
      paddingBottom: 2,
      flexShrink: 0,
    },
    tableControlsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'flex-end',
      marginBottom: 12,
      zIndex: 500,
      overflow: 'visible',
    },
    controlsRight: {
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 12 : 8,
      alignItems: 'flex-end',
      width: isMobile ? '100%' : 'auto',
      zIndex: 500,
      overflow: 'visible',
      flexShrink: 1,
      marginRight: isDesktop ? 105 : isTablet ? 30 : 20,
    },
    addButtonWrapper: {
      position: 'relative',
      zIndex: 1000,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    labelSpacer: {
      height: 20,
      marginBottom: 0,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#8b5cf6',
      borderRadius: 10,
      paddingHorizontal: isDesktop ? 16 : isTablet ? 14 : 12,
      paddingVertical: isDesktop ? 10 : isTablet ? 8 : 6,
      gap: isDesktop ? 8 : 6,
      height: isMobile ? 36 : 38,
      flexShrink: 0,
      justifyContent: 'center',
    },
    addButtonText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      fontWeight: '600',
      color: '#ffffff',
    },
    dropdownWrapperSort: {
      position: 'relative',
      width: isDesktop ? 150 : isTablet ? 130 : '100%',
      zIndex: 1000,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    dropdownWrapperShow: {
      position: 'relative',
      width: isDesktop ? 75 : isTablet ? 65 : '100%',
      zIndex: 1000,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    dropdownLabel: {
      fontSize: isDesktop ? 11 : 10,
      fontWeight: '600',
      color: '#64748b',
      marginBottom: 4,
      height: 16,
    },
    dropdownButtonSort: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      paddingVertical: isDesktop ? 8 : 6,
      height: isMobile ? 36 : 38,
      gap: isDesktop ? 8 : 6,
      justifyContent: 'center',
    },
    dropdownButtonShow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      paddingHorizontal: isDesktop ? 8 : 6,
      paddingVertical: isDesktop ? 8 : 6,
      height: isMobile ? 36 : 38,
      gap: 4,
      justifyContent: 'center',
    },
    dropdownButtonText: {
      flex: 1,
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      fontWeight: '500',
      color: '#0f172a',
    },
    dropdownButtonTextShow: {
      flex: 1,
      fontSize: isDesktop ? 12 : isTablet ? 11 : 10,
      fontWeight: '500',
      color: '#0f172a',
    },
    dropdownMenu: {
      position: 'absolute',
      top: 62,
      right: 0,
      minWidth: 120,
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 20,
      zIndex: 10000,
      maxHeight: 180,
    },
    dropdownMenuShow: {
      position: 'absolute',
      top: 62,
      right: 0,
      minWidth: 80,
      backgroundColor: '#ffffff',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 20,
      zIndex: 10000,
      maxHeight: 180,
    },
    dropdownMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    dropdownMenuItemActive: {
      backgroundColor: '#f8fafc',
    },
    dropdownMenuItemText: {
      fontSize: isDesktop ? 12 : 11,
      fontWeight: '500',
      color: '#0f172a',
    },
    dropdownMenuItemTextActive: {
      fontWeight: '600',
      color: '#8b5cf6',
    },
    // Table Styles
    tableWrapper: {
      marginBottom: 12,
      marginLeft: isDesktop ? 210 : isTablet ? 130 : 110,
    },
    tableScrollView: {
      width: '100%',
    },
    tableContainer: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#6366f1',
      borderBottomWidth: 2,
      borderBottomColor: '#4f46e5',
    },
    tableHeaderCell: {
      paddingVertical: isDesktop ? 16 : isTablet ? 14 : 12,
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tableHeaderText: {
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      fontWeight: '700',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    tableRowEven: {
      backgroundColor: '#ffffff',
    },
    tableRowOdd: {
      backgroundColor: '#fafafa',
    },
    tableCell: {
      paddingVertical: isDesktop ? 14 : isTablet ? 12 : 10,
      paddingHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
      justifyContent: 'center',
    },
    tableCellText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      color: '#0f172a',
      fontWeight: '500',
    },
    actionCell: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isDesktop ? 12 : isTablet ? 10 : 8,
      justifyContent: 'center',
    },
    activeStatusButton: {
      padding: isDesktop ? 6 : isTablet ? 5 : 4,
      borderRadius: 6,
      backgroundColor: '#f8fafc',
    },
    activeStatusButtonActive: {
      backgroundColor: '#d1fae5',
    },
    activeStatusButtonInactive: {
      backgroundColor: '#fee2e2',
    },
    actionButton: {
      padding: isDesktop ? 6 : isTablet ? 5 : 4,
      borderRadius: 6,
      backgroundColor: '#f8fafc',
    },
    emptyTableRow: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    emptyTableText: {
      fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
      color: '#94a3b8',
      fontWeight: '500',
    },
    // Pagination Styles
    paginationContainer: {
      flexDirection: isDesktop ? 'row' : 'column',
      justifyContent: 'space-between',
      alignItems: isDesktop ? 'center' : 'flex-start',
      marginTop: isDesktop ? 20 : isTablet ? 16 : 12,
      paddingTop: isDesktop ? 20 : isTablet ? 16 : 12,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      gap: isDesktop ? 12 : isTablet ? 10 : 8,
    },
    paginationInfo: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      color: '#64748b',
      fontWeight: '500',
    },
    paginationButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    paginationButton: {
      width: isDesktop ? 36 : isTablet ? 34 : 32,
      height: isDesktop ? 36 : isTablet ? 34 : 32,
      borderRadius: 8,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    paginationButtonDisabled: {
      backgroundColor: '#f8fafc',
      opacity: 0.5,
    },
    paginationText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      fontWeight: '600',
      color: '#0f172a',
      marginHorizontal: isDesktop ? 12 : isTablet ? 10 : 8,
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: isDesktop ? 550 : isTablet ? 480 : width - 40,
      maxHeight: height * 0.98,
      backgroundColor: '#ffffff',
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isDesktop ? 10 : isTablet ? 14 : 12,
      backgroundColor: '#6366f1',
      borderBottomWidth: 0,
    },
    modalTitle: {
      fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
      fontWeight: '700',
      color: '#ffffff',
    },
    modalCloseButton: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    modalBody: {
      maxHeight: height * 0.85,
      padding: isDesktop ? 24 : isTablet ? 20 : 18,
      backgroundColor: '#f8fafc',
    },
    modalField: {
      marginBottom: isDesktop ? 16 : isTablet ? 14 : 12,
    },
    modalLabel: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: 8,
    },
    modalInput: {
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      color: '#0f172a',
      backgroundColor: '#ffffff',
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    // Video Upload Styles
    videoUploadInput: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      backgroundColor: '#ffffff',
    },
    videoUploadInputText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#64748b',
      flex: 1,
    },
    videoErrorText: {
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      color: '#ef4444',
      marginTop: 6,
      fontWeight: '500',
    },
    videoHintText: {
      fontSize: isDesktop ? 12 : isTablet ? 11 : 10,
      color: '#94a3b8',
      marginTop: 6,
    },
    videoPreviewContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      borderRadius: 12,
      backgroundColor: '#f0fdf4',
      borderWidth: 1,
      borderColor: '#86efac',
    },
    videoInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    videoInfoText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      color: '#16a34a',
      fontWeight: '500',
    },
    removeVideoButton: {
      padding: 4,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      padding: isDesktop ? 10 : isTablet ? 14 : 12,
      backgroundColor: '#f1f5f9',
      borderTopWidth: 2,
      borderTopColor: '#e2e8f0',
    },
    modalCancelButton: {
      paddingHorizontal: isDesktop ? 24 : isTablet ? 20 : 18,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#94a3b8',
      backgroundColor: '#cbd5e1',
    },
    modalCancelButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#475569',
    },
    modalSubmitButton: {
      paddingHorizontal: isDesktop ? 24 : isTablet ? 20 : 18,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 12,
      backgroundColor: '#8b5cf6',
      shadowColor: '#8b5cf6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    modalSubmitButtonDisabled: {
      opacity: 0.6,
    },
    modalSubmitButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '700',
      color: '#ffffff',
    },
    // Delete Modal Styles
    deleteModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteModalContent: {
      width: isDesktop ? 400 : isTablet ? 360 : width - 60,
      backgroundColor: '#ffffff',
      borderRadius: 20,
      padding: isDesktop ? 32 : isTablet ? 28 : 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    deleteIconContainer: {
      marginBottom: isDesktop ? 20 : isTablet ? 18 : 16,
    },
    deleteIconCircle: {
      width: isDesktop ? 80 : isTablet ? 72 : 64,
      height: isDesktop ? 80 : isTablet ? 72 : 64,
      borderRadius: isDesktop ? 40 : isTablet ? 36 : 32,
      backgroundColor: '#fee2e2',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteModalTitle: {
      fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: isDesktop ? 12 : isTablet ? 10 : 8,
      textAlign: 'center',
    },
    deleteModalText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      color: '#64748b',
      textAlign: 'center',
      marginBottom: isDesktop ? 28 : isTablet ? 24 : 20,
      lineHeight: isDesktop ? 22 : isTablet ? 20 : 18,
    },
    deleteModalButtons: {
      flexDirection: 'row',
      gap: isDesktop ? 12 : isTablet ? 10 : 8,
      width: '100%',
    },
    deleteCancelButton: {
      flex: 1,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 10,
      backgroundColor: '#cbd5e1',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteCancelButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#475569',
    },
    deleteConfirmButton: {
      flex: 1,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 10,
      backgroundColor: '#ef4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteConfirmButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#ffffff',
    },
    // Activate Modal Styles
    activateIconCircle: {
      width: isDesktop ? 80 : isTablet ? 72 : 64,
      height: isDesktop ? 80 : isTablet ? 72 : 64,
      borderRadius: isDesktop ? 40 : isTablet ? 36 : 32,
      backgroundColor: '#d1fae5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    activateConfirmButton: {
      flex: 1,
      paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
      borderRadius: 10,
      backgroundColor: '#10b981',
      alignItems: 'center',
      justifyContent: 'center',
    },
    activateConfirmButtonText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '600',
      color: '#ffffff',
    },
  });
};
