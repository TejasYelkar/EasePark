
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

const COLORS = {
  navy: '#082D68',
  yellow: '#F5C400',
  background: '#F5F7FC',
  white: '#FFFFFF',
  text: '#101828',
  muted: '#64748B',
  border: '#E8EDF5',
  red: '#EF4444',
};

function SettingItem({
  icon,
  title,
  subtitle,
  color,
  onPress,
  danger = false,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingItem,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.settingIcon,
          { backgroundColor: color },
        ]}
      >
        <Ionicons
          name={icon}
          size={25}
          color={danger ? COLORS.red : COLORS.navy}
        />
      </View>

      <View style={styles.settingInfo}>
        <Text
          style={[
            styles.settingTitle,
            danger && { color: COLORS.red },
          ]}
        >
          {title}
        </Text>

        <Text style={styles.settingSubtitle}>
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={COLORS.muted}
      />
    </Pressable>
  );
}

export default function SettingsScreen({
  onBack,
  onLogout,
}: {
  onBack: () => void;
  onLogout: () => void;
}) {

  const [adminName, setAdminName] = useState('');
  const [newName, setNewName] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameModal, setNameModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);

  const saveName = () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter your name.');
      return;
    }

    setAdminName(newName.trim());
    setNewName('');
    setNameModal(false);

    Alert.alert('Success', 'Admin name updated successfully.');
  };

  const savePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must contain at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModal(false);

    Alert.alert(
      'Demo Mode',
      'Password form validated successfully. Actual password updates will be connected to the backend later.'
    );
  };

  const confirmLogout = () => {
    setLogoutModal(true);
  };

  const finishLogout = () => {
    setLogoutModal(false);
    onLogout();
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={onBack}
          >
            <Ionicons
              name="arrow-back"
              size={25}
              color={COLORS.white}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              Settings
            </Text>
            <Text style={styles.headerSubtitle}>
              Manage your admin account
            </Text>
          </View>

          <Ionicons
            name="settings-outline"
            size={30}
            color={COLORS.yellow}
          />
        </View>

        <View style={styles.content}>
          {/* Admin Profile */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Ionicons
                name="person"
                size={35}
                color={COLORS.navy}
              />
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {adminName}
              </Text>

              <Text style={styles.profileRole}>
                SmartPark Administrator
              </Text>
            </View>

            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>
                ADMIN
              </Text>
            </View>
          </View>

          {/* Account Settings */}
          <Text style={styles.sectionTitle}>
            Account Settings
          </Text>

          <View style={styles.settingsCard}>
            <SettingItem
              icon="person-outline"
              title="Change Name"
              subtitle="Update your admin display name"
              color="#FFF7D6"
              onPress={() => {
                setNewName(adminName);
                setNameModal(true);
              }}
            />

            <View style={styles.separator} />

            <SettingItem
              icon="lock-closed-outline"
              title="Change Password"
              subtitle="Update your account password"
              color="#E8EFF9"
              onPress={() => setPasswordModal(true)}
            />
          </View>

          {/* Other Settings */}
          <Text style={styles.sectionTitle}>
            Other
          </Text>

          <View style={styles.settingsCard}>
            <SettingItem
              icon="log-out-outline"
              title="Logout"
              subtitle="Sign out from your admin account"
              color="#FCE8E8"
              danger
              onPress={confirmLogout}
            />
          </View>

          <Text style={styles.versionText}>
            SmartPark Admin Panel
          </Text>

          <Text style={styles.versionNumber}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Change Name Modal */}
      <Modal
        visible={nameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setNameModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Change Name
              </Text>

              <Pressable onPress={() => setNameModal(false)}>
                <Ionicons
                  name="close"
                  size={25}
                  color={COLORS.muted}
                />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>
              Admin Name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.muted}
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="words"
            />

            <Pressable
              style={styles.saveButton}
              onPress={saveName}
            >
              <Text style={styles.saveButtonText}>
                Save Changes
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={passwordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setPasswordModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Change Password
              </Text>

              <Pressable onPress={() => setPasswordModal(false)}>
                <Ionicons
                  name="close"
                  size={25}
                  color={COLORS.muted}
                />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>
              Current Password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <Text style={styles.inputLabel}>
              New Password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={styles.inputLabel}>
              Confirm New Password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <Pressable
              style={styles.saveButton}
              onPress={savePassword}
            >
              <Text style={styles.saveButtonText}>
                Update Password
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={logoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log out?</Text>
            <Text style={styles.logoutMessage}>
              You will be signed out and returned to the role selection screen.
            </Text>

            <View style={styles.logoutActions}>
              <Pressable
                style={[styles.logoutButton, styles.cancelLogoutButton]}
                onPress={() => setLogoutModal(false)}
              >
                <Text style={styles.cancelLogoutText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.logoutButton, styles.confirmLogoutButton]}
                onPress={finishLogout}
              >
                <Text style={styles.confirmLogoutText}>Log out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  header: {
    backgroundColor: COLORS.navy,
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: '#FFFFFF20',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: '#D5DEEF',
    fontSize: 13,
    marginTop: 4,
  },

  content: {
    paddingHorizontal: 17,
    paddingTop: 25,
  },

  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 13,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 30,
    backgroundColor: '#FFF7D6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
  },

  profileRole: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },

  adminBadge: {
    backgroundColor: '#FFF7D6',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },

  adminBadgeText: {
    color: COLORS.navy,
    fontSize: 10,
    fontWeight: '800',
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 27,
    marginBottom: 13,
  },

  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  settingItem: {
    minHeight: 85,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  settingIcon: {
    width: 47,
    height: 47,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingInfo: {
    flex: 1,
  },

  settingTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },

  settingSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  pressed: {
    opacity: 0.7,
  },

  versionText: {
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: 12,
    marginTop: 35,
  },

  versionNumber: {
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: 11,
    marginTop: 5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 22,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 23,
  },

  modalTitle: {
    color: COLORS.navy,
    fontSize: 21,
    fontWeight: '800',
  },

  inputLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  input: {
    height: 49,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 17,
    backgroundColor: '#FAFBFE',
  },

  saveButton: {
    backgroundColor: COLORS.navy,
    height: 51,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  saveButtonText: {
    color: COLORS.yellow,
    fontSize: 15,
    fontWeight: '800',
  },

  logoutMessage: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 24,
  },

  logoutActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },

  logoutButton: {
    minWidth: 100,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelLogoutButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  confirmLogoutButton: {
    backgroundColor: COLORS.red,
  },

  cancelLogoutText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },

  confirmLogoutText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
