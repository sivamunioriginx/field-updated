import { Ionicons } from '@expo/vector-icons';
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
import { API_ENDPOINTS } from '../../constants/api';

interface ProcessItem {
  processName: string;
  processText: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqProcess {
  id: number;
  service_id?: number;
  service_name: string;
  created_at: string;
  status?: number;
  processes?: ProcessItem[];
  notes?: string[];
  faqs?: FaqItem[];
}

interface FaqsAndProcessProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function FaqsAndProcess({ searchQuery: externalSearchQuery, onSearchChange }: FaqsAndProcessProps) {
  const { width, height } = useWindowDimensions();
  const isDesktop = width > 768;
  const isTablet = width > 600 && width <= 768;
  const isMobile = width <= 600;
  const [faqsProcess, setFaqsProcess] = useState<FaqProcess[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number | 'ALL'>(5);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showRecordsDropdown, setShowRecordsDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFaqProcessId, setEditingFaqProcessId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [services, setServices] = useState<{ id: number; name: string }[]>([]);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [processes, setProcesses] = useState<ProcessItem[]>([{ processName: '', processText: '' }]);
  const [notes, setNotes] = useState<string[]>(['']);
  const [faqs, setFaqs] = useState<FaqItem[]>([{ question: '', answer: '' }]);
  const [originalValues, setOriginalValues] = useState<{
    service_id: number | null;
    processes: ProcessItem[];
    notes: string[];
    faqs: FaqItem[];
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [faqProcessToDelete, setFaqProcessToDelete] = useState<{ id: number; service_name: string } | null>(null);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [faqProcessToActivate, setFaqProcessToActivate] = useState<{ id: number; service_name: string } | null>(null);

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

  const fetchFaqsProcess = async () => {
    try {
      setLoading(true);
      
      const endpoint = API_ENDPOINTS.ADMIN_FAQS_PROCESS;
      console.log('📡 Fetching FAQs & Process from:', endpoint);
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status, response.statusText);
        setFaqsProcess([]);
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('📦 FAQs & Process response:', data);
      
      if (data.success) {
        const faqsProcessData = data.faqsProcess || data.data || [];
        console.log('✅ FAQs & Process fetched:', faqsProcessData.length, 'records');
        // Map the data to our interface
        const mappedData = faqsProcessData.map((item: any) => {
          // Use service_name from API, or find from services if available
          let serviceName = item.service_name;
          if (!serviceName && item.service_id) {
            const service = services.find(s => s.id === item.service_id);
            serviceName = service?.name || 'N/A';
          } else if (!serviceName) {
            serviceName = 'N/A';
          }
          
          return {
            id: item.id,
            service_id: item.service_id,
            service_name: serviceName,
            created_at: item.created_at || new Date().toISOString(),
            status: item.status !== undefined ? item.status : 1,
            processes: Array.isArray(item.processes) ? item.processes : [],
            notes: Array.isArray(item.notes) ? item.notes : [],
            faqs: Array.isArray(item.faqs) ? item.faqs : []
          };
        });
        setFaqsProcess(mappedData);
        setCurrentPage(1);
      } else {
        console.error('❌ Failed to fetch FAQs & Process:', data.message);
        setFaqsProcess([]);
      }
    } catch (error) {
      console.error('❌ Error fetching FAQs & Process:', error);
      setFaqsProcess([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFaqsProcess();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchServices();
    fetchFaqsProcess();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_SERVICES);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const servicesData = data.services || data.data || [];
          // Filter services where status = 1 and visibility = 1
          const filteredServices = servicesData.filter((s: any) => {
            const status = s.status !== undefined ? s.status : 1;
            const visibility = s.visibility !== undefined 
              ? (typeof s.visibility === 'boolean' ? (s.visibility ? 1 : 0) : s.visibility)
              : 1;
            return status === 1 && visibility === 1;
          });
          setServices(filteredServices.map((s: any) => ({
            id: s.id,
            name: s.name || s.service_name || ''
          })));
        }
      }
    } catch (error) {
      console.error('❌ Error fetching services:', error);
    }
  };

  // Filter and sort FAQs & Process
  const getFilteredAndSortedFaqsProcess = () => {
    let filtered = [...faqsProcess];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.service_name.toLowerCase().includes(query) ||
        (item.created_at && item.created_at.toLowerCase().includes(query))
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
  const getPaginatedFaqsProcess = () => {
    const filtered = getFilteredAndSortedFaqsProcess();
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
    : Math.ceil(getFilteredAndSortedFaqsProcess().length / (typeof recordsPerPage === 'number' ? recordsPerPage : 10));

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

  const handleEdit = (faqProcessId: number) => {
    const item = faqsProcess.find(f => f.id === faqProcessId);
    if (item) {
      setEditingFaqProcessId(faqProcessId);
      const service = services.find(s => s.name === item.service_name);
      setSelectedServiceId(service?.id || null);
      setProcesses(item.processes && item.processes.length > 0 ? item.processes : [{ processName: '', processText: '' }]);
      setNotes(item.notes && item.notes.length > 0 ? item.notes : ['']);
      setFaqs(item.faqs && item.faqs.length > 0 ? item.faqs : [{ question: '', answer: '' }]);
      setOriginalValues({
        service_id: service?.id || null,
        processes: item.processes || [{ processName: '', processText: '' }],
        notes: item.notes || [''],
        faqs: item.faqs || [{ question: '', answer: '' }]
      });
      setShowAddModal(true);
    }
  };

  // Check if form has changes (for edit mode)
  const hasChanges = () => {
    if (!editingFaqProcessId || !originalValues) return true; // Always enable for create mode
    const serviceChanged = selectedServiceId !== originalValues.service_id;
    const processesChanged = JSON.stringify(processes) !== JSON.stringify(originalValues.processes);
    const notesChanged = JSON.stringify(notes) !== JSON.stringify(originalValues.notes);
    const faqsChanged = JSON.stringify(faqs) !== JSON.stringify(originalValues.faqs);
    return serviceChanged || processesChanged || notesChanged || faqsChanged;
  };

  // Check if form is valid - all fields are required
  const isFormValid = () => {
    if (!selectedServiceId) return false;
    
    // Validate processes - at least one, and all must have both processName and processText
    if (!processes || processes.length === 0) return false;
    const invalidProcesses = processes.filter(p => !p.processName?.trim() || !p.processText?.trim());
    if (invalidProcesses.length > 0) return false;
    
    // Validate notes - at least one, and all must have content
    if (!notes || notes.length === 0) return false;
    const invalidNotes = notes.filter(n => !n?.trim());
    if (invalidNotes.length > 0) return false;
    
    // Validate FAQs - at least one, and all must have both question and answer
    if (!faqs || faqs.length === 0) return false;
    const invalidFaqs = faqs.filter(f => !f.question?.trim() || !f.answer?.trim());
    if (invalidFaqs.length > 0) return false;
    
    return true;
  };

  const handleAddProcess = () => {
    setProcesses([...processes, { processName: '', processText: '' }]);
  };

  const handleRemoveProcess = (index: number) => {
    if (processes.length > 1) {
      setProcesses(processes.filter((_, i) => i !== index));
    }
  };

  const handleProcessChange = (index: number, field: 'processName' | 'processText', value: string) => {
    // Remove semicolons from input
    const filteredValue = value.replace(/;/g, '');
    const updated = [...processes];
    updated[index] = { ...updated[index], [field]: filteredValue };
    setProcesses(updated);
  };

  const handleAddNote = () => {
    setNotes([...notes, '']);
  };

  const handleRemoveNote = (index: number) => {
    if (notes.length > 1) {
      setNotes(notes.filter((_, i) => i !== index));
    }
  };

  const handleNoteChange = (index: number, value: string) => {
    // Remove semicolons from input
    const filteredValue = value.replace(/;/g, '');
    const updated = [...notes];
    updated[index] = filteredValue;
    setNotes(updated);
  };

  const handleAddFaq = () => {
    setFaqs([...faqs, { question: '', answer: '' }]);
  };

  const handleRemoveFaq = (index: number) => {
    if (faqs.length > 1) {
      setFaqs(faqs.filter((_, i) => i !== index));
    }
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    // Remove semicolons from input
    const filteredValue = value.replace(/;/g, '');
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: filteredValue };
    setFaqs(updated);
  };

  const handleDelete = (faqProcessId: number) => {
    const item = faqsProcess.find(f => f.id === faqProcessId);
    if (item) {
      setFaqProcessToDelete({ id: faqProcessId, service_name: item.service_name });
      setShowDeleteModal(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!faqProcessToDelete) return;

    try {
      setLoading(true);
      const item = faqsProcess.find(f => f.id === faqProcessToDelete.id);
      if (!item) {
        Alert.alert('Error', 'Item not found');
        return;
      }

      const endpoint = `${API_ENDPOINTS.ADMIN_FAQS_PROCESS}/${faqProcessToDelete.id}`;
      const requestData = {
        ...item,
        status: 0
      };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Item Inactivated Successfully',
        });
        await fetchFaqsProcess();
        setShowDeleteModal(false);
        setFaqProcessToDelete(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to inactivate item');
      }
    } catch (error) {
      console.error('❌ Error inactivating item:', error);
      Alert.alert('Error', 'Failed to inactivate item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setFaqProcessToDelete(null);
  };

  const handleActivate = (faqProcessId: number) => {
    const item = faqsProcess.find(f => f.id === faqProcessId);
    if (item) {
      setFaqProcessToActivate({ id: faqProcessId, service_name: item.service_name });
      setShowActivateModal(true);
    }
  };

  const handleConfirmActivate = async () => {
    if (!faqProcessToActivate) return;

    try {
      setLoading(true);
      const item = faqsProcess.find(f => f.id === faqProcessToActivate.id);
      if (!item) {
        Alert.alert('Error', 'Item not found');
        return;
      }

      const endpoint = `${API_ENDPOINTS.ADMIN_FAQS_PROCESS}/${faqProcessToActivate.id}`;
      const requestData = {
        ...item,
        status: 1
      };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Item Activated Successfully',
        });
        await fetchFaqsProcess();
        setShowActivateModal(false);
        setFaqProcessToActivate(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to activate item');
      }
    } catch (error) {
      console.error('❌ Error activating item:', error);
      Alert.alert('Error', 'Failed to activate item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelActivate = () => {
    setShowActivateModal(false);
    setFaqProcessToActivate(null);
  };

  const handleAddFaqProcess = () => {
    setEditingFaqProcessId(null);
    setOriginalValues(null);
    setSelectedServiceId(null);
    setProcesses([{ processName: '', processText: '' }]);
    setNotes(['']);
    setFaqs([{ question: '', answer: '' }]);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingFaqProcessId(null);
    setOriginalValues(null);
    setSelectedServiceId(null);
    setProcesses([{ processName: '', processText: '' }]);
    setNotes(['']);
    setFaqs([{ question: '', answer: '' }]);
    setShowServiceDropdown(false);
  };

  const handleSubmitFaqProcess = async () => {
    // Validation - all fields are required
    if (!selectedServiceId) {
      Alert.alert('Validation Error', 'Please select a service');
      return;
    }

    // Validate processes - at least one, and all must have both processName and processText
    const validProcesses = processes.filter(p => p.processName?.trim() && p.processText?.trim());
    if (validProcesses.length === 0) {
      Alert.alert('Validation Error', 'At least one process with both Process Name and Process Text is required');
      return;
    }
    if (validProcesses.length !== processes.length) {
      Alert.alert('Validation Error', 'All processes must have both Process Name and Process Text');
      return;
    }

    // Validate notes - at least one, and all must have content
    const validNotes = notes.filter(n => n?.trim());
    if (validNotes.length === 0) {
      Alert.alert('Validation Error', 'At least one note is required');
      return;
    }
    if (validNotes.length !== notes.length) {
      Alert.alert('Validation Error', 'All notes must have content');
      return;
    }

    // Validate FAQs - at least one, and all must have both question and answer
    const validFaqs = faqs.filter(f => f.question?.trim() && f.answer?.trim());
    if (validFaqs.length === 0) {
      Alert.alert('Validation Error', 'At least one FAQ with both Question and Answer is required');
      return;
    }
    if (validFaqs.length !== faqs.length) {
      Alert.alert('Validation Error', 'All FAQs must have both Question and Answer');
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        service_id: selectedServiceId,
        processes: validProcesses,
        notes: validNotes,
        faqs: validFaqs,
        status: 1
      };

      // Determine endpoint and method
      const isEditMode = editingFaqProcessId !== null;
      const endpoint = isEditMode 
        ? `${API_ENDPOINTS.ADMIN_FAQS_PROCESS}/${editingFaqProcessId}`
        : API_ENDPOINTS.ADMIN_FAQS_PROCESS;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: isEditMode ? 'Item Updated Successfully' : 'New Item Created Successfully',
        });
        await fetchFaqsProcess();
        handleCloseModal();
      } else {
        Alert.alert('Error', data.message || `Failed to ${isEditMode ? 'update' : 'create'} item`);
      }
    } catch (error) {
      console.error('❌ Error creating/updating item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(width, height);

  if (loading && faqsProcess.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Loading FAQs & Process...</Text>
      </View>
    );
  }

  const filteredFaqsProcess = getFilteredAndSortedFaqsProcess();
  const paginatedFaqsProcess = getPaginatedFaqsProcess();

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#06b6d4']} />
        }
      >
      <View style={styles.customersContainer}>
        <View style={styles.customersHeader}>
          <Text style={styles.customersTitle}>
            FAQs & Process
          </Text>
        </View>

        <View style={styles.tableWrapper}>
          <View style={styles.tableControlsRow}>
            {/* Add Button, Sort and Records - aligned with table header */}
            <View style={styles.controlsRight}>
              {/* Add Button */}
              <View style={styles.addButtonWrapper}>
                <View style={styles.labelSpacer} />
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddFaqProcess}
                >
                  <Ionicons name="add" size={isDesktop ? 18 : 16} color="#ffffff" />
                  <Text style={styles.addButtonText}>Add</Text>
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
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 300 : isTablet ? 200 : 150 }]}>
                  <Ionicons name="document-text-outline" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Service Name</Text>
                </View>
                <View style={[styles.tableCell, styles.tableHeaderCell, { width: isDesktop ? 220 : isTablet ? 100 : 80 }]}>
                  <Ionicons name="settings" size={isDesktop ? 16 : 14} color="#ffffff" />
                  <Text style={styles.tableHeaderText}>Action</Text>
                </View>
              </View>

              {/* Table Body */}
              {paginatedFaqsProcess.length > 0 ? (
                paginatedFaqsProcess.map((item, index) => {
                  const serialNumber = recordsPerPage === 'ALL' 
                    ? index + 1 
                    : (currentPage - 1) * recordsPerPage + index + 1;
                  return (
                    <View 
                      key={item.id} 
                      style={[
                        styles.tableRow,
                        index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                      ]}
                    >
                      <View style={[styles.tableCell, { width: isDesktop ? 170 : isTablet ? 70 : 60 }]}>
                        <Text style={styles.tableCellText}>{serialNumber}</Text>
                      </View>
                      <View style={[styles.tableCell, { width: isDesktop ? 220 : isTablet ? 200 : 150 }]}>
                        <Text style={styles.tableCellText}>{item.service_name || 'N/A'}</Text>
                      </View>
                      <View style={[styles.tableCell, styles.actionCell, { width: isDesktop ? 220 : isTablet ? 100 : 80 }]}>
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleEdit(item.id)}
                        >
                          <Ionicons name="create-outline" size={isDesktop ? 18 : 16} color="#06b6d4" />
                        </TouchableOpacity>
                        {(item.status === 0) ? (
                          <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={() => handleActivate(item.id)}
                          >
                            <Ionicons name="checkmark-circle-outline" size={isDesktop ? 18 : 16} color="#10b981" />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={() => handleDelete(item.id)}
                          >
                            <Ionicons name="trash-outline" size={isDesktop ? 18 : 16} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.tableRow}>
                  <View style={[styles.tableCell, { width: isDesktop ? 80 : isTablet ? 70 : 60 }]}>
                    <Text style={styles.tableCellText}>-</Text>
                  </View>
                  <View style={[styles.tableCell, { width: isDesktop ? 300 : isTablet ? 200 : 150 }]}>
                    <Text style={styles.tableCellText}>No data available</Text>
                  </View>
                  <View style={[styles.tableCell, styles.actionCell, { width: isDesktop ? 220 : isTablet ? 100 : 80 }]}>
                    <Text style={styles.tableCellText}>-</Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Pagination Controls */}
        <View style={styles.paginationContainer}>
          <Text style={styles.paginationInfo}>
            {recordsPerPage === 'ALL' 
              ? `Showing all ${filteredFaqsProcess.length} entries`
              : (() => {
                  const pageSize = typeof recordsPerPage === 'number' ? recordsPerPage : 10;
                  const start = ((currentPage - 1) * pageSize) + 1;
                  const end = Math.min(currentPage * pageSize, filteredFaqsProcess.length);
                  return `Showing ${start} to ${end} of ${filteredFaqsProcess.length} entries`;
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
            <Text style={styles.deleteModalTitle}>Inactive Item?</Text>
            <Text style={styles.deleteModalText}>
              Are You Sure You Want to Inactive The {faqProcessToDelete?.service_name || 'Item'}?
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
              Are You Sure You Want to Make Active The {faqProcessToActivate?.service_name || 'Item'}?
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

      {/* Add/Edit Modal */}
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
                {editingFaqProcessId ? 'Edit Item' : 'Add New Item'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <View style={styles.modalBodyContainer}>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Section 1: Service Dropdown */}
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Service</Text>
                  <View style={styles.serviceDropdownWrapper}>
                    <TouchableOpacity
                      style={styles.serviceDropdownButton}
                      onPress={() => {
                        setShowServiceDropdown(!showServiceDropdown);
                      }}
                    >
                      <Text style={styles.serviceDropdownText}>
                        {selectedServiceId ? services.find(s => s.id === selectedServiceId)?.name || 'Select Service' : 'Select Service'}
                      </Text>
                      <Ionicons
                        name={showServiceDropdown ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

              {/* Section 2: Process Description */}
              <View style={styles.modalField}>
                <View style={styles.labelRow}>
                  <Text style={styles.modalLabel}>Process Description</Text>
                  <TouchableOpacity
                    style={styles.addFieldButtonInline}
                    onPress={handleAddProcess}
                  >
                    <Text style={styles.addFieldButtonTextInline}>+ Add Process</Text>
                  </TouchableOpacity>
                </View>
                {processes.map((process, index) => (
                  <View key={index} style={styles.dynamicFieldContainer}>
                    <View style={styles.dynamicFieldRow}>
                      <View style={styles.dynamicFieldInputContainer}>
                        <View style={styles.inputRow}>
                          <TextInput
                            style={[styles.modalInput, styles.dynamicFieldInput, styles.normalWidthInput]}
                            placeholder="Process Name"
                            placeholderTextColor="#94a3b8"
                            value={process.processName}
                            onChangeText={(value) => handleProcessChange(index, 'processName', value)}
                          />
                          <TextInput
                            style={[styles.modalInput, styles.dynamicFieldInput, styles.flexInput]}
                            placeholder="Process Text"
                            placeholderTextColor="#94a3b8"
                            value={process.processText}
                            onChangeText={(value) => handleProcessChange(index, 'processText', value)}
                            multiline
                            numberOfLines={3}
                          />
                        </View>
                      </View>
                      {index > 0 && (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveProcess(index)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Section 3: Notes */}
              <View style={styles.modalField}>
                <View style={styles.labelRow}>
                  <Text style={styles.modalLabel}>Note</Text>
                  <TouchableOpacity
                    style={styles.addFieldButtonInline}
                    onPress={handleAddNote}
                  >
                    <Text style={styles.addFieldButtonTextInline}>+ Add Note</Text>
                  </TouchableOpacity>
                </View>
                {notes.map((note, index) => (
                  <View key={index} style={styles.dynamicFieldContainer}>
                    <View style={styles.dynamicFieldRow}>
                      <TextInput
                        style={[styles.modalInput, styles.dynamicFieldInput, styles.fullWidthInput]}
                        placeholder="Enter note"
                        placeholderTextColor="#94a3b8"
                        value={note}
                        onChangeText={(value) => handleNoteChange(index, value)}
                      />
                      {index > 0 && (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveNote(index)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Section 4: Frequently Asked Questions */}
              <View style={styles.modalField}>
                <View style={styles.labelRow}>
                  <Text style={styles.modalLabel}>Frequently Asked Questions</Text>
                  <TouchableOpacity
                    style={styles.addFieldButtonInline}
                    onPress={handleAddFaq}
                  >
                    <Text style={styles.addFieldButtonTextInline}>+ Add FAQ</Text>
                  </TouchableOpacity>
                </View>
                {faqs.map((faq, index) => (
                  <View key={index} style={styles.dynamicFieldContainer}>
                    <View style={styles.dynamicFieldRow}>
                      <View style={styles.dynamicFieldInputContainer}>
                        <View style={styles.inputRow}>
                          <TextInput
                            style={[styles.modalInput, styles.dynamicFieldInput, styles.normalWidthInput]}
                            placeholder="Question"
                            placeholderTextColor="#94a3b8"
                            value={faq.question}
                            onChangeText={(value) => handleFaqChange(index, 'question', value)}
                          />
                          <TextInput
                            style={[styles.modalInput, styles.dynamicFieldInput, styles.flexInput]}
                            placeholder="Answer"
                            placeholderTextColor="#94a3b8"
                            value={faq.answer}
                            onChangeText={(value) => handleFaqChange(index, 'answer', value)}
                            multiline
                            numberOfLines={3}
                          />
                        </View>
                      </View>
                      {index > 0 && (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemoveFaq(index)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
            
            {/* Service Dropdown Menu - Rendered outside ScrollView */}
            {showServiceDropdown && (
              <View style={styles.serviceDropdownMenuContainer}>
                <View style={styles.serviceDropdownMenu}>
                  <ScrollView 
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    style={styles.serviceDropdownScrollView}
                  >
                    {services.map((service) => (
                      <TouchableOpacity
                        key={service.id}
                        style={[
                          styles.serviceDropdownItem,
                          selectedServiceId === service.id && styles.serviceDropdownItemActive
                        ]}
                        onPress={() => {
                          setSelectedServiceId(service.id);
                          setShowServiceDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.serviceDropdownItemText,
                          selectedServiceId === service.id && styles.serviceDropdownItemTextActive
                        ]}>
                          {service.name}
                        </Text>
                        {selectedServiceId === service.id && (
                          <Ionicons name="checkmark" size={20} color="#06b6d4" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
            </View>

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
                  (loading || !isFormValid() || !hasChanges()) && styles.modalSubmitButtonDisabled
                ]}
                onPress={handleSubmitFaqProcess}
                disabled={loading || !isFormValid() || !hasChanges()}
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
    tableWrapper: {
      marginBottom: 12,
      marginLeft: isDesktop ? 95 : isTablet ? 130 : 110,
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
      overflow: 'visible',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
      zIndex: 1000,
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
    modalBodyContainer: {
      position: 'relative',
      maxHeight: height * 0.85,
      backgroundColor: '#f8fafc',
      overflow: 'visible',
    },
    modalBody: {
      padding: isDesktop ? 24 : isTablet ? 20 : 18,
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
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'baseline',
      marginBottom: 8,
      gap: isDesktop ? 12 : isTablet ? 10 : 8,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    halfWidthInput: {
      flex: 1,
    },
    normalWidthInput: {
      width: isDesktop ? 200 : isTablet ? 150 : 120,
      flexShrink: 0,
    },
    flexInput: {
      flex: 1,
    },
    fullWidthInput: {
      flex: 1,
      width: '100%',
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
    serviceDropdownWrapper: {
      position: 'relative',
      zIndex: 1,
    },
    serviceDropdownButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      backgroundColor: '#ffffff',
    },
    serviceDropdownText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#0f172a',
      flex: 1,
    },
    serviceDropdownMenuContainer: {
      position: 'absolute',
      top: isDesktop ? 80 : isTablet ? 75 : 70,
      left: isDesktop ? 24 : isTablet ? 20 : 18,
      right: isDesktop ? 24 : isTablet ? 20 : 18,
      zIndex: 999999,
      elevation: 20,
    },
    serviceDropdownMenu: {
      backgroundColor: '#ffffff',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 20,
      maxHeight: 200,
      overflow: 'hidden',
    },
    serviceDropdownScrollView: {
      maxHeight: 200,
    },
    serviceDropdownItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isDesktop ? 14 : isTablet ? 12 : 10,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    serviceDropdownItemActive: {
      backgroundColor: '#f0fdfa',
    },
    serviceDropdownItemText: {
      fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
      fontWeight: '500',
      color: '#0f172a',
      flex: 1,
    },
    serviceDropdownItemTextActive: {
      color: '#06b6d4',
      fontWeight: '600',
    },
    dynamicFieldContainer: {
      marginBottom: isDesktop ? 12 : isTablet ? 10 : 8,
    },
    dynamicFieldRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    dynamicFieldInputContainer: {
      flex: 1,
    },
    dynamicFieldInput: {
      marginBottom: isDesktop ? 8 : isTablet ? 6 : 4,
    },
    textAreaInput: {
      minHeight: isDesktop ? 80 : isTablet ? 70 : 60,
      textAlignVertical: 'top',
    },
    removeButton: {
      padding: isDesktop ? 8 : isTablet ? 6 : 4,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: isDesktop ? 4 : 2,
    },
    addFieldButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: isDesktop ? 12 : isTablet ? 10 : 8,
      backgroundColor: '#f0fdfa',
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#06b6d4',
      borderStyle: 'dashed',
      marginTop: isDesktop ? 8 : isTablet ? 6 : 4,
    },
    addFieldButtonText: {
      fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
      fontWeight: '600',
      color: '#06b6d4',
    },
    addFieldButtonInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    addFieldButtonTextInline: {
      fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
      fontWeight: '600',
      color: '#06b6d4',
    },
  });
};

