import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import Toast from 'react-native-toast-message';
import { API_ENDPOINTS } from '../../constants/api';

interface Subcategorie {
  id: number;
  name: string;
  title: string;
  image: string;
  created_at: string;
  visibility?: boolean | number;
  status?: number;
}

interface SubcategoriesProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Subcategories({ searchQuery: externalSearchQuery, onSearchChange }: SubcategoriesProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  const [subcategories, setSubcategories] = useState<Subcategorie[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'ALL'>(5);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showRecordsDropdown, setShowRecordsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [visibilityStates, setVisibilityStates] = useState<Record<number, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<number | null>(null);
  const [subcategoryName, setSubcategoryName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<{ id: number; title: string }[]>([]);
  const [subcategoryImage, setSubcategoryImage] = useState<string | null>(null);
  const [subcategoryVideo, setSubcategoryVideo] = useState<{ uri: string; name: string; size: number } | null>(null);
  const [visibility, setVisibility] = useState<number>(1);
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<{ id: number; name: string } | null>(null);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [subcategoryToActivate, setSubcategoryToActivate] = useState<{ id: number; name: string } | null>(null);

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

  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      
      console.log('📡 Fetching subcategories from:', API_ENDPOINTS.ADMIN_SUBCATEGORIES);
      const response = await fetch(API_ENDPOINTS.ADMIN_SUBCATEGORIES);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        setSubcategories([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('📦 Subcategories response:', data);
      
      if (data.success) {
        const subcategoriesData = data.subcategories || data.data || [];
        console.log('✅ Subcategories fetched:', subcategoriesData.length, 'records');
        setSubcategories(subcategoriesData);
        // Initialize visibility states (default to true if not provided)
        const initialVisibility: Record<number, boolean> = {};
        subcategoriesData.forEach((subcat: Subcategorie) => {
          const visValue = subcat.visibility !== undefined 
            ? (typeof subcat.visibility === 'boolean' ? subcat.visibility : subcat.visibility === 1)
            : true;
          initialVisibility[subcat.id] = visValue;
        });
        setVisibilityStates(initialVisibility);
        setCurrentPage(1);
      } else {
        console.error('❌ Failed to fetch subcategories:', data.message);
        setSubcategories([]);
      }
    } catch (error) {
      console.error('❌ Error fetching subcategories:', error);
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSubcategories();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchSubcategories();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_CATEGORIES);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const categoriesData = data.categories || data.data || [];
          setCategories(categoriesData.map((cat: { id: number; title: string }) => ({
            id: cat.id,
            title: cat.title
          })));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
    }
  };

  // Filter and sort subcategories
  const getFilteredAndSortedSubcategories = () => {
    let filtered = [...subcategories];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(Subcategorie =>
        Subcategorie.name.toLowerCase().includes(query) ||
        Subcategorie.title.toLowerCase().includes(query) ||
        (Subcategorie.image && Subcategorie.image.toLowerCase().includes(query)) ||
        (Subcategorie.created_at && Subcategorie.created_at.toLowerCase().includes(query))
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
  const getPaginatedSubcategories = () => {
    const filtered = getFilteredAndSortedSubcategories();
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
    : Math.ceil(getFilteredAndSortedSubcategories().length / (typeof recordsPerPage === 'number' ? recordsPerPage : 10));

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

  const handleVisibilityToggle = async (subcategoryId: number, value: boolean) => {
    try {
      const subcategory = subcategories.find(sub => sub.id === subcategoryId);
      if (!subcategory) {
        Alert.alert('Error', 'Subcategory not found');
        return;
      }

      // Update local state optimistically
      setVisibilityStates(prev => ({
        ...prev,
        [subcategoryId]: value
      }));

      const formData = new FormData();
      formData.append('name', subcategory.name);
      const categoryId = (subcategory as any).category_id ? (subcategory as any).category_id.toString() : '';
      formData.append('category_id', categoryId);
      // Keep existing status, only update visibility
      const existingStatus = subcategory.status !== undefined ? subcategory.status : 1;
      formData.append('status', existingStatus.toString());
      const visibilityValue = value ? 1 : 0;
      formData.append('visibility', visibilityValue.toString());

      const response = await fetch(`${API_ENDPOINTS.ADMIN_SUBCATEGORIES}/${subcategoryId}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: value ? 'Visibility On Successfully' : 'Visibility Off Successfully',
        });
        await fetchSubcategories();
      } else {
        // Revert local state on error
        setVisibilityStates(prev => ({
          ...prev,
          [subcategoryId]: !value
        }));
        Alert.alert('Error', data.message || 'Failed to update visibility');
      }
    } catch (error) {
      console.error('❌ Error updating visibility:', error);
      // Revert local state on error
      setVisibilityStates(prev => ({
        ...prev,
        [subcategoryId]: !value
      }));
      Alert.alert('Error', 'Failed to update visibility. Please try again.');
    }
  };

  const handleEdit = (subcategoryId: number) => {
    const subcategory = subcategories.find(sub => sub.id === subcategoryId);
    if (subcategory) {
      setEditingSubcategoryId(subcategoryId);
      setSubcategoryName(subcategory.name || '');
      const categoryId = (subcategory as any).category_id ? parseInt((subcategory as any).category_id.toString()) : null;
      setSelectedCategoryId(categoryId);
      // Construct image URL - check if it's already a full URL or just filename
      let imageUrl = subcategory.image;
      if (imageUrl && !imageUrl.startsWith('http')) {
        // If it's just a filename, construct full URL
        imageUrl = `http://192.168.31.84:3001/uploads/subcategorys/${imageUrl}`;
      }
      const finalImageUrl = imageUrl || null;
      setSubcategoryImage(finalImageUrl);
      // Set video if exists
      const videoTitle = (subcategory as any).video_title;
      if (videoTitle) {
        const videoUrl = `http://192.168.31.84:3001/uploads/subcategory_videos/${videoTitle}`;
        setSubcategoryVideo({ uri: videoUrl, name: videoTitle, size: 0 });
      } else {
        setSubcategoryVideo(null);
      }
      // Set visibility - check both status and visibility fields
      const visValue = subcategory.visibility !== undefined 
        ? (typeof subcategory.visibility === 'boolean' ? (subcategory.visibility ? 1 : 0) : subcategory.visibility)
        : (subcategory.status !== undefined ? subcategory.status : 1);
      setVisibility(visValue);
      setShowAddModal(true);
    }
  };

  const handleDelete = (subcategoryId: number) => {
    const subcategory = subcategories.find(sub => sub.id === subcategoryId);
    if (subcategory) {
      setSubcategoryToDelete({ id: subcategoryId, name: subcategory.name });
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!subcategoryToDelete) return;

    try {
      setLoading(true);
      const subcategory = subcategories.find(sub => sub.id === subcategoryToDelete.id);
      if (!subcategory) {
        Alert.alert('Error', 'Subcategory not found');
        return;
      }

      const formData = new FormData();
      formData.append('name', subcategory.name);
      formData.append('category_id', (subcategory as any).category_id?.toString() || '');
      formData.append('status', '0');
      // Keep existing visibility
      const existingVisibility = subcategory.visibility !== undefined 
        ? (typeof subcategory.visibility === 'boolean' ? (subcategory.visibility ? 1 : 0) : subcategory.visibility)
        : 1;
      formData.append('visibility', existingVisibility.toString());

      const response = await fetch(`${API_ENDPOINTS.ADMIN_SUBCATEGORIES}/${subcategoryToDelete.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Subcategory Inactivated Successfully',
        });
        await fetchSubcategories();
        setShowDeleteModal(false);
        setSubcategoryToDelete(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to inactivate subcategory');
      }
    } catch (error) {
      console.error('❌ Error inactivating subcategory:', error);
      Alert.alert('Error', 'Failed to inactivate subcategory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setSubcategoryToDelete(null);
  };

  const handleActivate = (subcategoryId: number) => {
    const subcategory = subcategories.find(sub => sub.id === subcategoryId);
    if (subcategory) {
      setSubcategoryToActivate({ id: subcategoryId, name: subcategory.name });
      setShowActivateModal(true);
    }
  };

  const handleConfirmActivate = async () => {
    if (!subcategoryToActivate) return;

    try {
      setLoading(true);
      const subcategory = subcategories.find(sub => sub.id === subcategoryToActivate.id);
      if (!subcategory) {
        Alert.alert('Error', 'Subcategory not found');
        return;
      }

      const formData = new FormData();
      formData.append('name', subcategory.name);
      formData.append('category_id', (subcategory as any).category_id?.toString() || '');
      formData.append('status', '1');
      // Keep existing visibility
      const existingVisibility = subcategory.visibility !== undefined 
        ? (typeof subcategory.visibility === 'boolean' ? (subcategory.visibility ? 1 : 0) : subcategory.visibility)
        : 1;
      formData.append('visibility', existingVisibility.toString());

      const response = await fetch(`${API_ENDPOINTS.ADMIN_SUBCATEGORIES}/${subcategoryToActivate.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Subcategory Activated Successfully',
        });
        await fetchSubcategories();
        setShowActivateModal(false);
        setSubcategoryToActivate(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to activate subcategory');
      }
    } catch (error) {
      console.error('❌ Error activating subcategory:', error);
      Alert.alert('Error', 'Failed to activate subcategory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelActivate = () => {
    setShowActivateModal(false);
    setSubcategoryToActivate(null);
  };

  const handleAddSubcategory = () => {
    setEditingSubcategoryId(null);
    setSubcategoryName('');
    setSelectedCategoryId(null);
    setSubcategoryImage(null);
    setSubcategoryVideo(null);
    setVisibility(1);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingSubcategoryId(null);
    setSubcategoryName('');
    setSelectedCategoryId(null);
    setSubcategoryImage(null);
    setSubcategoryVideo(null);
    setVisibility(1);
    setShowVisibilityDropdown(false);
    setShowCategoryDropdown(false);
  };

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSubcategoryImage(asset.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleVideoUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileSize = asset.size || 0;
        const maxSize = 10 * 1024 * 1024; // 10 MB in bytes

        if (fileSize > maxSize) {
          Alert.alert('File Too Large', 'Please select a video file smaller than 10 MB.');
          return;
        }

        // Validate video file type
        const mimeType = asset.mimeType || '';
        const isVideo = mimeType.startsWith('video/') || 
                       asset.name.match(/\.(mp4|mov|avi|mkv|webm|flv|wmv|3gp)$/i);

        if (!isVideo) {
          Alert.alert('Invalid File', 'Please select a valid video file.');
          return;
        }

        setSubcategoryVideo({
          uri: asset.uri,
          name: asset.name,
          size: fileSize,
        });

        // Toast.show({
        //   type: 'success',
        //   text1: 'Video Selected',
        //   text2: `${asset.name} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`,
        // });
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const handleSubmitSubcategory = async () => {
    if (!subcategoryName.trim()) {
      Alert.alert('Validation Error', 'Please enter subcategory name');
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert('Validation Error', 'Please select a category');
      return;
    }

    // In edit mode, image is optional if not changed; in create mode, image is required
    const isEditMode = editingSubcategoryId !== null;
    const isNewImage = subcategoryImage && (subcategoryImage.startsWith('blob:') || subcategoryImage.startsWith('data:') || subcategoryImage.startsWith('file://'));
    
    if (!isEditMode && !subcategoryImage) {
      Alert.alert('Validation Error', 'Please upload subcategory image');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', subcategoryName.trim());
      formData.append('category_id', selectedCategoryId.toString());
      formData.append('status', visibility.toString());
      formData.append('visibility', visibility.toString());

      // Only append image if it's a new upload (blob/data/file URLs) or create mode
      if (subcategoryImage && (isNewImage || !isEditMode)) {
        const uriParts = subcategoryImage.split('.');
        const fileExtension = uriParts.length > 1 ? uriParts[uriParts.length - 1].toLowerCase() : 'jpg';
        const fileName = `subcategory_${Date.now()}.${fileExtension}`;
        
        let mimeType = 'image/jpeg';
        if (fileExtension === 'png') {
          mimeType = 'image/png';
        } else if (fileExtension === 'gif') {
          mimeType = 'image/gif';
        }

        const isWeb = typeof window !== 'undefined';
        if (isWeb) {
          try {
            if (subcategoryImage.startsWith('blob:') || subcategoryImage.startsWith('data:')) {
              const response = await fetch(subcategoryImage);
              const blob = await response.blob();
              const fileToUpload = new File([blob], fileName, { type: mimeType });
              formData.append('image', fileToUpload);
            } else if (!subcategoryImage.startsWith('http')) {
              const response = await fetch(subcategoryImage);
              const blob = await response.blob();
              const fileToUpload = new File([blob], fileName, { type: mimeType });
              formData.append('image', fileToUpload);
            }
          } catch (error) {
            console.error('❌ Error converting image:', error);
            formData.append('image', {
              uri: subcategoryImage,
              name: fileName,
              type: mimeType,
            } as any);
          }
        } else {
          formData.append('image', {
            uri: subcategoryImage,
            name: fileName,
            type: mimeType,
          } as any);
        }
      }

      // Handle video upload
      if (subcategoryVideo) {
        const isNewVideo = subcategoryVideo.uri && !subcategoryVideo.uri.startsWith('http://192.168.31.84:3001/uploads/subcategory_videos/');
        
        if (isNewVideo) {
          const uriParts = subcategoryVideo.name.split('.');
          const fileExtension = uriParts.length > 1 ? uriParts[uriParts.length - 1].toLowerCase() : 'mp4';
          const videoFileName = `subcategory_video_${Date.now()}.${fileExtension}`;
          
          let videoMimeType = 'video/mp4';
          if (fileExtension === 'mov') {
            videoMimeType = 'video/quicktime';
          } else if (fileExtension === 'avi') {
            videoMimeType = 'video/x-msvideo';
          } else if (fileExtension === 'mkv') {
            videoMimeType = 'video/x-matroska';
          } else if (fileExtension === 'webm') {
            videoMimeType = 'video/webm';
          }

          const isWeb = typeof window !== 'undefined';
          if (isWeb) {
            try {
              const response = await fetch(subcategoryVideo.uri);
              const blob = await response.blob();
              const fileToUpload = new File([blob], videoFileName, { type: videoMimeType });
              formData.append('video', fileToUpload);
            } catch (error) {
              console.error('❌ Error converting video:', error);
              formData.append('video', {
                uri: subcategoryVideo.uri,
                name: videoFileName,
                type: videoMimeType,
              } as any);
            }
          } else {
            formData.append('video', {
              uri: subcategoryVideo.uri,
              name: videoFileName,
              type: videoMimeType,
            } as any);
          }
        }
      }

      const url = isEditMode 
        ? `${API_ENDPOINTS.ADMIN_SUBCATEGORIES}/${editingSubcategoryId}`
        : API_ENDPOINTS.ADMIN_SUBCATEGORIES;
      
      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: isEditMode ? 'Subcategory Updated Successfully' : 'Subcategory Created Successfully',
        });
        await fetchSubcategories();
        handleCloseModal();
      } else {
        Alert.alert('Error', data.message || `Failed to ${isEditMode ? 'update' : 'create'} subcategory`);
      }
    } catch (error) {
      console.error(`❌ Error ${editingSubcategoryId ? 'updating' : 'creating'} subcategory:`, error);
      Alert.alert('Error', `Failed to ${editingSubcategoryId ? 'update' : 'create'} subcategory. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const visibilityOptions = [
    { label: 'On', value: 1 },
    { label: 'Off', value: 0 },
  ];

  const styles = createStyles(width, height);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Loading subcategories...</Text>
      </View>
    );
  }

  if (subcategories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="people-outline" size={64} color="#cbd5e1" />
        </View>
        <Text style={styles.emptyTitle}>No Subcategories Found</Text>
        <Text style={styles.emptyText}>There are no subcategories available at the moment.</Text>
      </View>
    );
  }

  const filteredSubcategories = getFilteredAndSortedSubcategories();
  const paginatedSubcategories = getPaginatedSubcategories();

  return (
    <View style={{ flex: 1 }}>
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#06b6d4']} />
      }
    >
      <View style={styles.customersContainer}>
        <View style={styles.customersHeader}>
          <Text style={styles.customersTitle}>
            SubCategories
          </Text>
        </View>

        <View style={styles.tableWrapper}>
          <View style={styles.tableControlsRow}>
            {/* Add Subcategory, Sort and Records - aligned with table header */}
            <View style={styles.controlsRight}>
              {/* Add Subcategory Button */}
              <View style={styles.addButtonWrapper}>
                <View style={styles.labelSpacer} />
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddSubcategory}
                >
                  <Ionicons name="add" size={isDesktop ? 18 : 16} color="#ffffff" />
                  <Text style={styles.addButtonText}>Add Subcategory</Text>
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
                          <Ionicons name="checkmark" size={16} color="#06b6d4" />
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
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 120 : isTablet ? 100 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Name</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 310 : isTablet ? 100 : 50 }]}>
                  <Ionicons name="person" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Category Name</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 360 : isTablet ? 70 : 35 }]}>
                  <Ionicons name="location" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Created On</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 100 : isTablet ? 100 : 80 }]}>
                  <Ionicons name="eye" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Visibility</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 220 : isTablet ? 100 : 80 }]}>
                  <Ionicons name="settings" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Action</Text>
                </View>
              </View>

              {/* Table Body */}
              {paginatedSubcategories.map((subcategories, index) => {
                const serialNumber = recordsPerPage === 'ALL' 
                  ? index + 1 
                  : (currentPage - 1) * recordsPerPage + index + 1;
                return (
                  <View 
                    key={subcategories.id} 
                    style={[
                      styles.tableRow,
                      index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                    ]}
                  >
                    <View style={[styles.tableCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                      <Text style={styles.tableCellText}>{serialNumber}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 220 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{subcategories.name || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 300 : isTablet ? 100 : 50 }]}>
                      <Text style={styles.tableCellText}>{subcategories.title || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 300 : isTablet ? 70 : 35  }]}>
                      <Text style={styles.tableCellText}>{formatDate(subcategories.created_at) || 'N/A'}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: isDesktop ? 60 : isTablet ? 100 : 80 }]}>
                      <Switch
                        value={visibilityStates[subcategories.id] !== undefined ? visibilityStates[subcategories.id] : true}
                        onValueChange={(value) => handleVisibilityToggle(subcategories.id, value)}
                        trackColor={{ false: '#e2e8f0', true: '#06b6d4' }}
                        thumbColor="#ffffff"
                        ios_backgroundColor="#e2e8f0"
                      />
                    </View>
                    <View style={[styles.tableCell, styles.actionCell, { width: isDesktop ? 220 : isTablet ? 100 : 80 }]}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleEdit(subcategories.id)}
                      >
                        <Ionicons name="create-outline" size={isDesktop ? 18 : 16} color="#06b6d4" />
                      </TouchableOpacity>
                      {(subcategories.status === 0) ? (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleActivate(subcategories.id)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={isDesktop ? 18 : 16} color="#10b981" />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleDelete(subcategories.id)}
                        >
                          <Ionicons name="trash-outline" size={isDesktop ? 18 : 16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Pagination Controls */}
        <View style={styles.paginationContainer}>
          <Text style={styles.paginationInfo}>
            {recordsPerPage === 'ALL' 
              ? `Showing all ${filteredSubcategories.length} entries`
              : (() => {
                  const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
                  const start = ((currentPage - 1) * pageSize) + 1;
                  const end = Math.min(currentPage * pageSize, filteredSubcategories.length);
                  return `Showing ${start} to ${end} of ${filteredSubcategories.length} entries`;
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
      </View>
    </ScrollView>

      {/* Add Subcategory Modal */}
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
              <Text style={styles.modalTitle}>{editingSubcategoryId ? 'Edit Subcategorie' : 'Add Subcategorie'}</Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Subcategory Name and Category in one row */}
              <View style={[styles.modalRow, { zIndex: 1000 }]}>
                <View style={[styles.modalField, styles.modalFieldHalf, { zIndex: 1 }]}>
                  <Text style={styles.modalLabel}>Subcategory Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter subcategory name"
                    placeholderTextColor="#94a3b8"
                    value={subcategoryName}
                    onChangeText={setSubcategoryName}
                  />
                </View>

                <View style={[styles.modalField, styles.modalFieldHalf, { zIndex: 10000 }]}>
                  <Text style={styles.modalLabel}>Category</Text>
                  <View style={styles.categoryDropdownWrapper}>
                    <TouchableOpacity
                      style={styles.categoryDropdownButton}
                      onPress={() => {
                        setShowCategoryDropdown(!showCategoryDropdown);
                        setShowVisibilityDropdown(false);
                      }}
                    >
                      <Text style={styles.categoryDropdownText}>
                        {selectedCategoryId 
                          ? categories.find(cat => cat.id === selectedCategoryId)?.title || 'Select Category'
                          : 'Select Category'}
                      </Text>
                      <Ionicons
                        name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                    {showCategoryDropdown && (
                      <View style={styles.categoryDropdownMenu}>
                        <ScrollView 
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                          style={styles.categoryDropdownScrollView}
                        >
                          {categories.map((category) => (
                            <TouchableOpacity
                              key={category.id}
                              style={[
                                styles.categoryDropdownItem,
                                selectedCategoryId === category.id && styles.categoryDropdownItemActive
                              ]}
                              onPress={() => {
                                setSelectedCategoryId(category.id);
                                setShowCategoryDropdown(false);
                              }}
                            >
                              <Text style={[
                                styles.categoryDropdownItemText,
                                selectedCategoryId === category.id && styles.categoryDropdownItemTextActive
                              ]}>
                                {category.title}
                              </Text>
                              {selectedCategoryId === category.id && (
                                <Ionicons name="checkmark" size={20} color="#06b6d4" />
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Subcategory Image and Video in one row */}
              <View style={[styles.modalRow, { zIndex: 1 }]}>
                {/* Subcategory Image */}
                <View style={[styles.modalField, styles.modalFieldHalf]}>
                  <Text style={styles.modalLabel}>Subcategory Image</Text>
                  <TouchableOpacity
                    style={styles.imageUploadInput}
                    onPress={handleImageUpload}
                  >
                    <Text style={styles.imageUploadInputText}>
                      {subcategoryImage ? 'Image Selected' : 'Tap to upload image'}
                    </Text>
                    <Ionicons name="cloud-upload-outline" size={20} color="#06b6d4" />
                  </TouchableOpacity>
                  {subcategoryImage && (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: subcategoryImage }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setSubcategoryImage(null)}
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Subcategory Video */}
                <View style={[styles.modalField, styles.modalFieldHalf, { zIndex: 1 }]}>
                  <Text style={styles.modalLabel}>Subcategory Video (Max 10 MB)</Text>
                  <TouchableOpacity
                    style={styles.videoUploadInput}
                    onPress={handleVideoUpload}
                  >
                    <Text style={styles.videoUploadInputText}>
                      {subcategoryVideo ? 'Video Selected' : 'Tap to upload video'}
                    </Text>
                    <Ionicons name="videocam-outline" size={20} color="#8b5cf6" />
                  </TouchableOpacity>
                  {subcategoryVideo && (
                    <View style={styles.videoPreviewContainer}>
                      <View style={styles.videoInfoContainer}>
                        <Ionicons name="videocam" size={24} color="#8b5cf6" />
                        <View style={styles.videoTextContainer}>
                          <Text style={styles.videoFileName} numberOfLines={1}>
                            {subcategoryVideo.name}
                          </Text>
                          {subcategoryVideo.size > 0 && (
                            <Text style={styles.videoFileSize}>
                              {(subcategoryVideo.size / (1024 * 1024)).toFixed(2)} MB
                            </Text>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.removeVideoButton}
                        onPress={() => setSubcategoryVideo(null)}
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Visibility */}
              <View style={[styles.modalField, { zIndex: 1 }]}>
                <Text style={styles.modalLabel}>Visibility</Text>
                <View style={styles.visibilityDropdownWrapper}>
                  <TouchableOpacity
                    style={styles.visibilityDropdownButton}
                    onPress={() => {
                      setShowVisibilityDropdown(!showVisibilityDropdown);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Text style={styles.visibilityDropdownText}>
                      {visibilityOptions.find(opt => opt.value === visibility)?.label || 'On'}
                    </Text>
                    <Ionicons
                      name={showVisibilityDropdown ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                  {showVisibilityDropdown && (
                    <View style={styles.visibilityDropdownMenu}>
                      {visibilityOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.visibilityDropdownItem,
                            visibility === option.value && styles.visibilityDropdownItemActive
                          ]}
                          onPress={() => {
                            setVisibility(option.value);
                            setShowVisibilityDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.visibilityDropdownItemText,
                            visibility === option.value && styles.visibilityDropdownItemTextActive
                          ]}>
                            {option.label}
                          </Text>
                          {visibility === option.value && (
                            <Ionicons name="checkmark" size={20} color="#06b6d4" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
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
                  (loading || !subcategoryName.trim() || !selectedCategoryId || (!editingSubcategoryId && !subcategoryImage)) && styles.modalSubmitButtonDisabled
                ]}
                onPress={handleSubmitSubcategory}
                disabled={loading || !subcategoryName.trim() || !selectedCategoryId || (!editingSubcategoryId && !subcategoryImage)}
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
            <Text style={styles.deleteModalTitle}>Inactive Subcategory Type?</Text>
            <Text style={styles.deleteModalText}>
              Are You Sure You Want to Inactive The {subcategoryToDelete?.name || 'Subcategory'}?
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
              Are You Sure You Want to Make Active The {subcategoryToActivate?.name || 'Subcategory'}?
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
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 80,
    },
    emptyIconContainer: {
      width: isDesktop ? 120 : isTablet ? 100 : 80,
      height: isDesktop ? 120 : isTablet ? 100 : 80,
      borderRadius: isDesktop ? 60 : isTablet ? 50 : 40,
      backgroundColor: '#f8fafc',
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
      maxWidth: isDesktop ? 300 : isTablet ? 280 : width - 40,
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
      backgroundColor: '#06b6d4',
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
      color: '#06b6d4',
    },
    // Table Styles
    tableWrapper: {
      marginBottom: 12,
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
    actionButton: {
      padding: isDesktop ? 6 : isTablet ? 5 : 4,
      borderRadius: 6,
      backgroundColor: '#f8fafc',
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
      padding: isDesktop ? 20 : isTablet ? 18 : 16,
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
      overflow: 'visible',
    },
    modalRow: {
      flexDirection: 'row',
      gap: isDesktop ? 16 : isTablet ? 14 : 12,
      marginBottom: isDesktop ? 16 : isTablet ? 14 : 12,
    },
    modalField: {
      marginBottom: isDesktop ? 16 : isTablet ? 14 : 12,
      overflow: 'visible',
    },
    modalFieldHalf: {
      flex: 1,
      overflow: 'visible',
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
    // Category Dropdown Styles
    categoryDropdownWrapper: {
      position: 'relative',
      zIndex: 9999,
    },
    categoryDropdownButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      backgroundColor: '#ffffff',
    },
    categoryDropdownText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#0f172a',
      flex: 1,
    },
    categoryDropdownMenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 4,
      backgroundColor: '#ffffff',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 9999,
      zIndex: 9999,
      maxHeight: isDesktop ? 250 : isTablet ? 220 : 190,
      overflow: 'hidden',
    },
    categoryDropdownScrollView: {
      maxHeight: isDesktop ? 250 : isTablet ? 220 : 190,
    },
    categoryDropdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    categoryDropdownItemActive: {
      backgroundColor: '#f0fdfa',
    },
    categoryDropdownItemText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#0f172a',
    },
    categoryDropdownItemTextActive: {
      color: '#06b6d4',
      fontWeight: '600',
    },
    // Image Upload Styles
    imageUploadInput: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      backgroundColor: '#ffffff',
    },
    imageUploadInputText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#64748b',
      flex: 1,
    },
    imagePreviewContainer: {
      position: 'relative',
      width: '100%',
      height: isDesktop ? 80 : isTablet ? 70 : 60,
      marginTop: 12,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: '#e2e8f0',
      backgroundColor: '#ffffff',
    },
    imagePreview: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    removeImageButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 50,
      padding: 4,
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
    videoPreviewContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#e2e8f0',
      backgroundColor: '#f8f4ff',
    },
    videoInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    videoTextContainer: {
      flex: 1,
    },
    videoFileName: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: 4,
    },
    videoFileSize: {
      fontSize: isDesktop ? 12 : isTablet ? 11 : 10,
      fontWeight: '500',
      color: '#64748b',
    },
    removeVideoButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 50,
      padding: 4,
    },
    // Visibility Dropdown Styles
    visibilityDropdownWrapper: {
      position: 'relative',
    },
    visibilityDropdownButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      backgroundColor: '#ffffff',
    },
    visibilityDropdownText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#0f172a',
    },
    visibilityDropdownMenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 4,
      backgroundColor: '#ffffff',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 1001,
      zIndex: 1001,
    },
    visibilityDropdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    visibilityDropdownItemActive: {
      backgroundColor: '#f0fdfa',
    },
    visibilityDropdownItemText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#0f172a',
    },
    visibilityDropdownItemTextActive: {
      color: '#06b6d4',
      fontWeight: '600',
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      padding: isDesktop ? 20 : isTablet ? 18 : 16,
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
      backgroundColor: '#06b6d4',
      shadowColor: '#06b6d4',
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