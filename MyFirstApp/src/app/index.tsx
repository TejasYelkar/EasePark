import React, { useEffect, useRef, useState } from "react";
import TwoWheelerParkingScreen from '../screens/TwoWheelerParkingScreen';
import FourWheelerParkingScreen from '../screens/FourWheelerParkingScreen';
import { checkBackendConnection } from "../services/api";
import {
  confirmPasswordReset as confirmPasswordResetWithBackend,
  loginRegisteredUser,
  requestPasswordReset as requestPasswordResetWithBackend,
  registerUser as registerUserWithBackend,
  updateRegisteredUser,
} from "../services/parking-bookings";
import AdminDashboardScreen, {
  type AdminDestination,
} from '../screens/admin/DashboardScreen';
import ParkingSlotsScreen from '../screens/admin/ParkingSlotsScreen';
import VehicleManagementScreen from '../screens/admin/VehicleManagementScreen';
import AnprScreen from '../screens/admin/AnprScreen';
import FineManagementScreen from '../screens/admin/FineManagementScreen';
import PaymentsScreen from '../screens/admin/PaymentsScreen';
import ReportsAnalyticsScreen from '../screens/admin/ReportsAnalyticsScreen';
import CustomerManagementScreen from '../screens/admin/CustomerManagementScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';
import {
  normalizeAccount,
  UserDashboardScreen,
  UserProfileScreen,
  type Account,
  type VehicleType,
} from '../screens/UserScreens';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// COLORS
const YELLOW = "#F5B51B";
const BROWN = "#654719";
const CREAM = "#FFF2D5";
const WHITE = "#FFFFFF";
const USER_PASSWORD_KEY = "easypark_demo_password";

type AppToast = {
  message: string;
  tone: "success" | "error";
};

type LoginFieldErrors = {
  username?: string;
  password?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  form?: string;
};

async function clearLegacyUserPassword() {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(USER_PASSWORD_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(USER_PASSWORD_KEY);
}

type Screen =
  | "splash"
  | "role"
  | "admin"
  | "user"
  | "adminHome"
  | "userHome"
  | "userProfile";

// LOGO
function Logo({ size = 1 }: { size?: number }) {
  return (
    <View style={styles.logoContainer}>
      <Text style={[styles.cloud, { fontSize: 39 * size }]}>☁</Text>
      <Text style={[styles.logoP, { fontSize: 73 * size }]}>P</Text>
      <Text style={[styles.logoTitle, { fontSize: 25 * size }]}>
        EasyPark
      </Text>
      <Text style={[styles.logoSubtitle, { fontSize: 10 * size }]}>
        PARKING SYSTEM
      </Text>
    </View>
  );
}

// INPUT FIELD
function InputField({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  maxLength,
  error,
}: {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "characters" | "words";
  maxLength?: number;
  error?: string;
}) {
  return (
    <View style={styles.inputField}>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
      />
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// YELLOW BUTTON
function MainButton({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.mainButton, disabled && styles.mainButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={styles.mainButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

// VEHICLE TYPE SELECTOR
function VehicleSelector({
  selected,
  onSelect,
  error,
}: {
  selected: VehicleType | "";
  onSelect: (type: VehicleType) => void;
  error?: string;
}) {
  return (
    <View style={styles.vehicleSection}>
      <Text style={styles.fieldLabel}>Select Vehicle Type</Text>

      <View style={styles.vehicleRow}>
        {(["2 Wheeler", "4 Wheeler"] as VehicleType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.vehicleButton,
              selected === type && styles.vehicleSelected,
            ]}
            onPress={() => onSelect(type)}
          >
            <Text
              style={[
                styles.vehicleText,
                selected === type && styles.vehicleSelectedText,
              ]}
            >
              {type === "2 Wheeler" ? "🏍️" : "🚗"}
              {"\n"}
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// MAIN APP
export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [adminPage, setAdminPage] = useState<AdminDestination | "dashboard">(
    "dashboard"
  );

  // PARKING SCREEN NAVIGATION
  const [activeParkingScreen, setActiveParkingScreen] =
    useState<VehicleType | null>(null);

  // ADMIN
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminErrors, setAdminErrors] = useState<LoginFieldErrors>({});

  // USER FORM
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<LoginFieldErrors>({});

  // SAVED DEMO ACCOUNT
  const [activeUserProfile, setActiveUserProfile] = useState<Account | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [toast, setToast] = useState<AppToast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, tone: AppToast["tone"] = "success") => {
    setToast({ message, tone });
  };

  // SPLASH ANIMATION
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.2,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => setScreen("role"), 2800);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const result = await checkBackendConnection();
        console.log("BACKEND CONNECTED SUCCESSFULLY:", result);
      } catch (error) {
        console.error("BACKEND CONNECTION FAILED:", error);
      }
    };

    void testConnection();
  }, []);

  // RESET USER FORM
  const resetUserForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setPhone("");
    setVehicleType("");
    setVehicleNumber("");
    setShowPassword(false);
    setIsPasswordReset(false);
    setResetCodeSent(false);
    setResetEmail("");
    setResetCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setLoginErrors({});
    setAdminErrors({});
  };

  // ADMIN LOGIN
  const adminLogin = () => {
    const errors: LoginFieldErrors = {};
    if (!adminUsername.trim()) errors.username = "Admin username is required.";
    if (!adminPassword) errors.password = "Password is required.";
    if (Object.keys(errors).length > 0) {
      setAdminErrors(errors);
      return;
    }

    setAdminErrors({});
    if (!adminUsername.trim() || !adminPassword) {
      return;
    }

    if (
      adminUsername.trim() === "admin" &&
      adminPassword === "admin123"
    ) {
      setAdminPage("dashboard");
      setScreen("adminHome");
      setAdminUsername("");
      setAdminPassword("");
    } else {
      setAdminErrors({
        form: "Incorrect admin username or password.",
      });
    }
  };

  // VALIDATE VEHICLE NUMBER
  const validateVehicleNumber = (number: string) => {
    const cleaned = number.toUpperCase().replace(/[\s-]/g, "");

    return /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/.test(cleaned);
  };

  // VALIDATE EMAIL FORMAT
  const validateEmail = (value: string) => {
    const normalizedEmail = value.trim().toLowerCase();

    const emailPattern =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

    const emailParts = normalizedEmail.split("@");
    const emailDomain = emailParts[1] ?? "";
    const domainLabels = emailDomain.split(".");

    const invalidDomain =
      !emailPattern.test(normalizedEmail) ||
      normalizedEmail.length > 254 ||
      emailParts[0].length > 64 ||
      domainLabels.some(
        (label) =>
          !label ||
          label.length > 63 ||
          label.startsWith("-") ||
          label.endsWith("-")
      ) ||
      domainLabels[domainLabels.length - 1].length < 2;

    return !invalidDomain;
  };

  // USER REGISTRATION
  const registerUser = async () => {
    if (isRegistering) return;

    if (
      !username.trim() ||
      !email.trim() ||
      !password ||
      !phone ||
      !vehicleType ||
      !vehicleNumber.trim()
    ) {
      showToast("Please fill in all registration fields.", "error");
      return;
    }

    // USERNAME VALIDATION
    if (username.trim().length < 3) {
      showToast("Username must have at least 3 characters.", "error");
      return;
    }

    // EMAIL VALIDATION
    const normalizedEmail = email.trim().toLowerCase();

    if (!validateEmail(normalizedEmail)) {
      showToast("Enter a valid email address, for example name@example.com.", "error");
      return;
    }

    // PHONE VALIDATION
    if (!/^[6-9]\d{9}$/.test(phone)) {
      showToast(
        "Phone number must contain 10 digits and start with 6, 7, 8 or 9.",
        "error"
      );
      return;
    }

    // PASSWORD VALIDATION
    if (password.length < 8) {
      showToast("Password must contain at least 8 characters.", "error");
      return;
    }

    // VEHICLE NUMBER VALIDATION
    if (!validateVehicleNumber(vehicleNumber)) {
      showToast("Enter a valid vehicle number, for example MH02AB1234.", "error");
      return;
    }

    const newAccount: Account = {
      username: username.trim(),
      email: normalizedEmail,
      phone: phone,
      vehicleType,
      vehicleNumber: vehicleNumber
        .toUpperCase()
        .replace(/[\s-]/g, ""),
      vehicles: [{
        vehicleType,
        vehicleNumber: vehicleNumber.toUpperCase().replace(/[\s-]/g, ""),
      }],
    };

    setIsRegistering(true);
    try {
      const registeredUser = await registerUserWithBackend(newAccount, password);
      const registeredAccount = {
        ...newAccount,
        backendUserId: registeredUser.id,
      };
      await clearLegacyUserPassword();
      await AsyncStorage.setItem(
        "easypark_profile",
        JSON.stringify(registeredAccount)
      );

      setActiveUserProfile(registeredAccount);
      setPassword("");
      setScreen("userHome");
      showToast("User created successfully");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not create your account.",
        "error"
      );
    } finally {
      setIsRegistering(false);
    }
  };

  // EXISTING USER LOGIN
  const loginUser = async () => {
    const errors: LoginFieldErrors = {};
    if (!username.trim()) errors.username = "Username is required.";
    if (!password) errors.password = "Password is required.";
    if (!vehicleType) errors.vehicleType = "Select a vehicle type.";
    if (!vehicleNumber.trim()) {
      errors.vehicleNumber = "Vehicle number is required.";
    } else if (!validateVehicleNumber(vehicleNumber)) {
      errors.vehicleNumber = "Enter a valid vehicle number.";
    }
    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors);
      return;
    }

    setLoginErrors({});
    if (
      !username.trim() ||
      !password ||
      !vehicleType ||
      !vehicleNumber.trim()
    ) {
      return;
    }

    if (!validateVehicleNumber(vehicleNumber)) {
      return;
    }

    const normalizedVehicleNumber = vehicleNumber
      .toUpperCase()
      .replace(/[\s-]/g, "");

    setIsAuthenticating(true);
    try {
      const registeredUser = await loginRegisteredUser({
        username: username.trim(),
        password,
        vehicleType,
        vehicleNumber: normalizedVehicleNumber,
      });
      const loggedInAccount: Account = {
        username: registeredUser.username,
        email: registeredUser.email,
        phone: registeredUser.phone,
        vehicleType,
        vehicleNumber: normalizedVehicleNumber,
        vehicles: registeredUser.vehicles,
        backendUserId: registeredUser.id,
      };
      await clearLegacyUserPassword();
      await AsyncStorage.setItem(
        "easypark_profile",
        JSON.stringify(loggedInAccount)
      );
      setActiveUserProfile(loggedInAccount);
      setVehicleNumber(normalizedVehicleNumber);
      setPassword("");
      setScreen("userHome");
      Alert.alert("Login Successful", `Welcome back, ${registeredUser.username}!`);
    } catch (error) {
      const requestError = error as Error & {
        fieldErrors?: Record<string, string>;
      };
      if (requestError.fieldErrors) {
        setLoginErrors({
          username: requestError.fieldErrors.username,
          password: requestError.fieldErrors.password,
          vehicleType: requestError.fieldErrors.vehicleType,
          vehicleNumber: requestError.fieldErrors.vehicleNumber,
          form: requestError.fieldErrors.form,
        });
      } else {
        setLoginErrors({
          form:
            error instanceof Error
              ? error.message
              : "Unable to verify your login.",
        });
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const requestPasswordReset = async () => {
    const normalizedEmail = resetEmail.trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) {
      showToast("Enter a valid email address.", "error");
      return;
    }

    setIsResettingPassword(true);
    try {
      await requestPasswordResetWithBackend(normalizedEmail);
      setResetEmail(normalizedEmail);
      setResetCodeSent(true);
      showToast(
        "If an account exists for this email, a verification code has been sent."
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not request a reset code.",
        "error"
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  const resetPassword = async () => {
    if (!resetCode.trim() || !newPassword || !confirmNewPassword) {
      showToast("Enter the verification code and complete both password fields.", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("Password must contain at least 8 characters.", "error");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast("The passwords do not match.", "error");
      return;
    }

    setIsResettingPassword(true);
    try {
      await confirmPasswordResetWithBackend(
        resetEmail.trim().toLowerCase(),
        resetCode.trim(),
        newPassword
      );
      await clearLegacyUserPassword();
      setIsPasswordReset(false);
      setResetCodeSent(false);
      setResetCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      setEmail(resetEmail.trim().toLowerCase());
      setPassword("");
      showToast("Password updated. Sign in with your new password.");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not reset your password.",
        "error"
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  // GOOGLE LOGIN
  const googleLogin = () => {
    Alert.alert(
      "Google Sign-In Setup",
      "Google sign-in requires a Google OAuth Client ID and authentication configuration. We can connect this after setting up your Google project."
    );
  };

  const finishLogout = () => {
    resetUserForm();
    setAdminUsername("");
    setAdminPassword("");
    setShowAdminPassword(false);
    setActiveParkingScreen(null);
    setActiveUserProfile(null);
    setAdminPage("dashboard");
    setScreen("role");
  };

  const saveUserProfile = async (profile: Account) => {
    let normalizedProfile = normalizeAccount(profile);
    if (normalizedProfile.backendUserId) {
      const updatedUser = await updateRegisteredUser(
        normalizedProfile.backendUserId,
        normalizedProfile
      );
      normalizedProfile = {
        ...normalizedProfile,
        backendUserId: updatedUser.id,
      };
    }
    await AsyncStorage.setItem(
      "easypark_profile",
      JSON.stringify(normalizedProfile)
    );
    setActiveUserProfile(normalizedProfile);
  };

  // SHOW THE SELECTED PARKING SCREEN
  if (activeParkingScreen === "2 Wheeler") {
    return (
      <TwoWheelerParkingScreen
        vehicleNumber={vehicleNumber || activeUserProfile?.vehicleNumber || ""}
        backendUserId={activeUserProfile?.backendUserId}
        onBack={() => {
          setActiveParkingScreen(null);
        }}
      />
    );
  }

  if (activeParkingScreen === "4 Wheeler") {
    return (
      <FourWheelerParkingScreen
        vehicleNumber={vehicleNumber || activeUserProfile?.vehicleNumber || ""}
        backendUserId={activeUserProfile?.backendUserId}
        onBack={() => {
          setActiveParkingScreen(null);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* 1. SPLASH SCREEN */}
      {screen === "splash" && (
        <LinearGradient
          colors={["#FFF4D9", "#FFE5A8"]}
          style={styles.splash}
        >
          <Animated.View
            style={{
              opacity,
              transform: [{ scale }],
              alignItems: "center",
            }}
          >
            <Logo size={1.45} />
          </Animated.View>

          <View style={styles.splashWave1} />
          <View style={styles.splashWave2} />
        </LinearGradient>
      )}

      {/* 2. ROLE SELECTION */}
      {screen === "role" && (
        <View style={styles.roleScreen}>
          <View style={styles.roleCard}>
            <Logo size={0.85} />

            <Text style={styles.heading}>Choose Your Role</Text>

            <Text style={styles.description}>
              Welcome. Please select your{"\n"}role to continue.
            </Text>

            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => setScreen("admin")}
            >
              <Text style={styles.adminButtonText}>
                🔑 ADMIN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.userButton}
              onPress={() => {
                setIsSignUp(false);
                resetUserForm();
                setScreen("user");
              }}
            >
              <Text style={styles.userButtonText}>
                👤 USER
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.roleWave1} />
          <View style={styles.roleWave2} />
        </View>
      )}

      {/* 3. ADMIN LOGIN */}
      {screen === "admin" && (
        <View style={styles.authScreen}>
          <LinearGradient
            colors={[YELLOW, "#E9A710"]}
            style={styles.authHeader}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setScreen("role")}
            >
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>

            <Text style={styles.authHeading}>
              Admin Login
            </Text>

            <View style={styles.authWave1} />
          </LinearGradient>

          <View style={styles.authCard}>
            <Logo size={0.8} />

            <View style={styles.form}>
              <InputField
                placeholder="Admin Username"
                value={adminUsername}
                onChangeText={(value) => {
                  setAdminUsername(value);
                  setAdminErrors((current) => ({
                    ...current,
                    username: undefined,
                    form: undefined,
                  }));
                }}
                autoCapitalize="none"
                error={adminErrors.username}
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    adminErrors.password && styles.passwordErrorInput,
                  ]}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={adminPassword}
                  onChangeText={(value) => {
                    setAdminPassword(value);
                    setAdminErrors((current) => ({
                      ...current,
                      password: undefined,
                      form: undefined,
                    }));
                  }}
                  secureTextEntry={!showAdminPassword}
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowAdminPassword(!showAdminPassword)
                  }
                >
                  <Text style={styles.showText}>
                    {showAdminPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
              {adminErrors.password && (
                <Text style={styles.fieldError}>{adminErrors.password}</Text>
              )}
              {adminErrors.form && (
                <Text style={styles.formError}>{adminErrors.form}</Text>
              )}

              <Text style={styles.demoHint}>
                Demo admin username: admin{"\n"}
                Demo admin password: admin123
              </Text>

              <MainButton
                title="Log In"
                onPress={adminLogin}
              />
            </View>
          </View>
        </View>
      )}

      {/* 4. USER LOGIN AND REGISTRATION */}
      {screen === "user" && (
        <KeyboardAvoidingView
          style={styles.authScreen}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <LinearGradient
            colors={[YELLOW, "#E9A710"]}
            style={styles.userHeader}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                resetUserForm();
                setScreen("role");
              }}
            >
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => {
                if (isPasswordReset) {
                  setIsPasswordReset(false);
                  setResetCodeSent(false);
                  return;
                }
                setIsSignUp(!isSignUp);
                resetUserForm();
              }}
            >
              <Text style={styles.registerText}>
                {isSignUp || isPasswordReset ? "Sign In" : "Register"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.authHeading}>
              {isPasswordReset
                ? "Reset Password"
                : isSignUp
                  ? "Create Account"
                  : "Welcome User"}
            </Text>

            <View style={styles.authWave1} />
          </LinearGradient>

          <ScrollView
            style={styles.userCardScroll}
            contentContainerStyle={styles.userCard}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Logo size={0.75} />

            <Text style={styles.welcomeText}>
              {isPasswordReset
                ? "Verify your email to choose a new password."
                : isSignUp
                  ? "Register to start using EasyPark."
                  : "Welcome to EasyPark Parking System.\nLog in to continue."}
            </Text>

            {isPasswordReset ? (
              <>
                <InputField
                  placeholder="Registered Email Address"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {resetCodeSent && (
                  <>
                    <InputField
                      placeholder="Email verification code"
                      value={resetCode}
                      onChangeText={value =>
                        setResetCode(value.replace(/\D/g, "").slice(0, 6))
                      }
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="New password (minimum 8 characters)"
                        placeholderTextColor="#999"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                      />
                    </View>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Confirm new password"
                        placeholderTextColor="#999"
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                        secureTextEntry={!showPassword}
                      />
                    </View>
                  </>
                )}

                <MainButton
                  title={
                    isResettingPassword
                      ? "Please wait..."
                      : resetCodeSent
                        ? "Update Password"
                        : "Send Verification Code"
                  }
                  onPress={resetCodeSent ? resetPassword : requestPasswordReset}
                  disabled={isResettingPassword}
                />
                {resetCodeSent && (
                  <TouchableOpacity
                    style={styles.switchButton}
                    onPress={requestPasswordReset}
                    disabled={isResettingPassword}
                  >
                    <Text style={styles.switchText}>Resend verification code</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                {isSignUp ? (
                  <>
                <InputField
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />

                <InputField
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />

                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password (minimum 8 characters)"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />

                  <TouchableOpacity
                    onPress={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    <Text style={styles.showText}>
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <InputField
                  placeholder="Phone Number (10 digits)"
                  value={phone}
                  onChangeText={(value) =>
                    setPhone(value.replace(/\D/g, "").slice(0, 10))
                  }
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                  </>
                ) : (
                  <>
                <InputField
                  placeholder="Username"
                  value={username}
                  onChangeText={(value) => {
                    setUsername(value);
                    setLoginErrors((current) => ({
                      ...current,
                      username: undefined,
                      form: undefined,
                    }));
                  }}
                  error={!isSignUp ? loginErrors.username : undefined}
                />

                <View
                  style={[
                    styles.passwordContainer,
                    loginErrors.password && styles.passwordErrorInput,
                  ]}
                >
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      setLoginErrors((current) => ({
                        ...current,
                        password: undefined,
                        form: undefined,
                      }));
                    }}
                    secureTextEntry={!showPassword}
                  />

                  <TouchableOpacity
                    onPress={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    <Text style={styles.showText}>
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {!isSignUp && loginErrors.password && (
                  <Text style={styles.fieldError}>{loginErrors.password}</Text>
                )}
                  </>
                )}

            <VehicleSelector
              selected={vehicleType}
              onSelect={(value) => {
                setVehicleType(value);
                setLoginErrors((current) => ({
                  ...current,
                  vehicleType: undefined,
                  form: undefined,
                }));
              }}
              error={!isSignUp ? loginErrors.vehicleType : undefined}
            />

            <InputField
              placeholder="Vehicle Number (e.g. MH02AB1234)"
              value={vehicleNumber}
              onChangeText={(value) =>
                {
                  setVehicleNumber(value.toUpperCase());
                  setLoginErrors((current) => ({
                    ...current,
                    vehicleNumber: undefined,
                    form: undefined,
                  }));
                }
              }
              autoCapitalize="characters"
              error={!isSignUp ? loginErrors.vehicleNumber : undefined}
            />

            {!isSignUp && (
              loginErrors.form ? (
                <Text style={styles.formError}>{loginErrors.form}</Text>
              ) : null
            )}

            {!isSignUp && (
              <Text style={styles.userDemoHint}>
                Demo login: tejas / 12345678{"\n"}
                Vehicle: MH03AQ7091 (select either vehicle type)
              </Text>
            )}

            <MainButton
              title={
                isRegistering
                  ? "Creating..."
                  : isAuthenticating
                    ? "Signing in..."
                    : isSignUp
                      ? "Create Account"
                      : "Sign In"
              }
              onPress={isSignUp ? registerUser : loginUser}
              disabled={isRegistering || isAuthenticating}
            />

            {!isSignUp && (
              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => {
                  setResetEmail(email);
                  setResetCode("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setResetCodeSent(false);
                  setIsPasswordReset(true);
                }}
              >
                <Text style={styles.switchText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => {
                setIsSignUp(!isSignUp);
                resetUserForm();
              }}
            >
              <Text style={styles.switchText}>
                {isSignUp
                  ? "Already registered? Sign In"
                  : "New to EasyPark? Sign Up"}
              </Text>
            </TouchableOpacity>

            {!isSignUp && (
              <>
                <View style={styles.orContainer}>
                  <View style={styles.line} />
                  <Text style={styles.orText}>Or</Text>
                  <View style={styles.line} />
                </View>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={googleLogin}
                >
                  <Text style={styles.googleText}>G</Text>
                  <Text style={styles.socialText}>
                    Continue with Google
                  </Text>
                </TouchableOpacity>
              </>
            )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {screen === "adminHome" && adminPage === "dashboard" && (
        <AdminDashboardScreen onNavigate={setAdminPage} />
      )}

      {screen === "adminHome" && adminPage === "parking-slots" && (
        <ParkingSlotsScreen onBack={() => setAdminPage("dashboard")} />
      )}

      {screen === "adminHome" && adminPage === "vehicle-management" && (
        <VehicleManagementScreen onBack={() => setAdminPage("dashboard")} />
      )}

      {screen === "adminHome" && adminPage === "anpr" && (
        <AnprScreen onBack={() => setAdminPage("dashboard")} />
      )}

      {screen === "adminHome" && adminPage === "fine-management" && (
        <FineManagementScreen onBack={() => setAdminPage("dashboard")} />
      )}

      {screen === "adminHome" && adminPage === "payments" && (
        <PaymentsScreen onBack={() => setAdminPage("dashboard")} />
      )}

      {screen === "adminHome" && adminPage === "reports" && (
        <ReportsAnalyticsScreen onBack={() => setAdminPage("dashboard")} />
      )}

      {screen === "adminHome" && adminPage === "customer-management" && (
        <CustomerManagementScreen onBack={() => setAdminPage("dashboard")} />
      )}

      {screen === "adminHome" && adminPage === "settings" && (
        <SettingsScreen
          onBack={() => setAdminPage("dashboard")}
          onLogout={finishLogout}
        />
      )}

      {screen === "userHome" && activeUserProfile && (
        <UserDashboardScreen
          account={activeUserProfile}
          onOpenProfile={() => setScreen("userProfile")}
          onPark={(vehicle) => {
            setVehicleType(vehicle.vehicleType);
            setVehicleNumber(vehicle.vehicleNumber);
            setActiveParkingScreen(vehicle.vehicleType);
          }}
        />
      )}

      {screen === "userProfile" && activeUserProfile && (
        <UserProfileScreen
          account={activeUserProfile}
          onBack={() => setScreen("userHome")}
          onSave={saveUserProfile}
          onLogout={finishLogout}
        />
      )}
      {toast && (
        <View
          pointerEvents="none"
          style={[
            styles.toast,
            toast.tone === "error" && styles.errorToast,
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// STYLES
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CREAM,
  },

  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  cloud: {
    color: BROWN,
    marginBottom: -15,
  },

  logoP: {
    color: YELLOW,
    fontWeight: "900",
    lineHeight: 80,
    textShadowColor: BROWN,
    textShadowOffset: { width: 1.5, height: 2 },
    textShadowRadius: 1,
  },

  logoTitle: {
    color: BROWN,
    fontWeight: "900",
    marginTop: 5,
  },

  logoSubtitle: {
    color: BROWN,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 3,
  },

  splashWave1: {
    position: "absolute",
    width: 500,
    height: 260,
    backgroundColor: YELLOW,
    bottom: -170,
    left: -90,
    borderRadius: 180,
    transform: [{ rotate: "-12deg" }],
  },

  splashWave2: {
    position: "absolute",
    width: 450,
    height: 180,
    backgroundColor: "#F9C84F",
    bottom: -125,
    right: -140,
    borderRadius: 150,
    transform: [{ rotate: "12deg" }],
  },

  roleScreen: {
    flex: 1,
    backgroundColor: CREAM,
    justifyContent: "center",
    paddingHorizontal: 24,
    overflow: "hidden",
  },

  roleCard: {
    backgroundColor: WHITE,
    borderRadius: 28,
    padding: 30,
    alignItems: "center",
    elevation: 7,
    zIndex: 2,
  },

  heading: {
    fontSize: 23,
    fontWeight: "800",
    color: "#171717",
    marginTop: 30,
  },

  description: {
    color: "#333",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 28,
  },

  adminButton: {
    width: "100%",
    backgroundColor: YELLOW,
    borderRadius: 30,
    padding: 15,
    alignItems: "center",
    marginBottom: 12,
  },

  adminButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#292018",
  },

  userButton: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#D6AD43",
    borderRadius: 30,
    padding: 13,
    alignItems: "center",
  },

  userButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#292018",
  },

  roleWave1: {
    position: "absolute",
    width: 420,
    height: 180,
    backgroundColor: YELLOW,
    bottom: -110,
    left: -120,
    borderRadius: 150,
  },

  roleWave2: {
    position: "absolute",
    width: 350,
    height: 130,
    backgroundColor: "#F9C84F",
    bottom: -90,
    right: -130,
    borderRadius: 150,
  },

  authScreen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  authHeader: {
    height: "35%",
    paddingHorizontal: 25,
    paddingTop: 30,
    overflow: "hidden",
  },

  userHeader: {
    height: "30%",
    paddingHorizontal: 25,
    paddingTop: 30,
    overflow: "hidden",
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    zIndex: 3,
  },

  backText: {
    fontSize: 38,
    color: BROWN,
    lineHeight: 42,
  },

  authHeading: {
    fontSize: 25,
    fontWeight: "900",
    color: "#191919",
    marginTop: 20,
    zIndex: 2,
  },

  authWave1: {
    position: "absolute",
    width: 400,
    height: 170,
    backgroundColor: "#F9C84F",
    bottom: -105,
    left: -100,
    borderRadius: 180,
  },

  authCard: {
    flex: 1,
    backgroundColor: WHITE,
    marginTop: -10,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    alignItems: "center",
    paddingTop: 25,
    paddingHorizontal: 28,
  },

  form: {
    width: "100%",
    marginTop: 35,
  },

  input: {
    backgroundColor: "#F1F1F1",
    borderRadius: 30,
    height: 50,
    paddingHorizontal: 20,
    color: "#222",
    fontSize: 14,
    width: "100%",
  },

  inputField: {
    width: "100%",
    marginBottom: 12,
  },

  inputError: {
    borderWidth: 1,
    borderColor: "#B42318",
  },

  fieldError: {
    color: "#B42318",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 18,
  },

  formError: {
    color: "#B42318",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },

  passwordContainer: {
    backgroundColor: "#F1F1F1",
    borderRadius: 30,
    height: 50,
    marginBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },

  passwordInput: {
    flex: 1,
    color: "#222",
    fontSize: 14,
    height: "100%",
  },

  passwordErrorInput: {
    borderWidth: 1,
    borderColor: "#B42318",
  },

  showText: {
    color: BROWN,
    fontSize: 12,
    fontWeight: "700",
  },

  demoHint: {
    fontSize: 12,
    color: BROWN,
    lineHeight: 20,
    marginBottom: 15,
  },

  userDemoHint: {
    fontSize: 12,
    color: BROWN,
    lineHeight: 20,
    marginBottom: 15,
    textAlign: "center",
  },

  mainButton: {
    backgroundColor: YELLOW,
    borderRadius: 30,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    width: "100%",
  },

  mainButtonDisabled: {
    opacity: 0.65,
  },

  mainButtonText: {
    color: "#211A10",
    fontWeight: "800",
    fontSize: 15,
  },

  toast: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    backgroundColor: "#16834A",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 11,
    zIndex: 20,
    elevation: 8,
  },

  errorToast: {
    backgroundColor: "#B42318",
  },

  toastText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "700",
  },

  registerButton: {
    position: "absolute",
    top: 37,
    right: 27,
    zIndex: 4,
  },

  registerText: {
    color: "#282018",
    fontWeight: "700",
    fontSize: 13,
  },

  userCardScroll: {
    flex: 1,
    marginTop: -15,
    backgroundColor: WHITE,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    zIndex: 2,
  },

  userCard: {
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 25,
    paddingBottom: 40,
  },

  welcomeText: {
    fontSize: 13,
    textAlign: "center",
    color: "#333",
    lineHeight: 20,
    marginTop: 16,
    marginBottom: 20,
  },

  vehicleSection: {
    width: "100%",
    marginBottom: 14,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: BROWN,
    marginBottom: 10,
  },

  vehicleRow: {
    flexDirection: "row",
    gap: 12,
  },

  vehicleButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#D6AD43",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    backgroundColor: WHITE,
  },

  vehicleSelected: {
    backgroundColor: YELLOW,
    borderColor: YELLOW,
  },

  vehicleText: {
    fontSize: 14,
    color: BROWN,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "600",
  },

  vehicleSelectedText: {
    color: "#211A10",
    fontWeight: "800",
  },

  switchButton: {
    marginTop: 16,
    marginBottom: 8,
  },

  switchText: {
    fontSize: 13,
    color: BROWN,
    fontWeight: "700",
  },

  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 17,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#DDD",
  },

  orText: {
    color: "#777",
    paddingHorizontal: 15,
    fontSize: 13,
  },

  socialButton: {
    width: "100%",
    height: 47,
    borderWidth: 1,
    borderColor: "#D6D6D6",
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  googleText: {
    fontSize: 21,
    fontWeight: "900",
    color: "#4285F4",
    marginRight: 13,
  },

  socialText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
  },

  homeScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    backgroundColor: CREAM,
  },

  homeHeading: {
    fontSize: 25,
    fontWeight: "900",
    color: BROWN,
    marginTop: 30,
    marginBottom: 12,
    textAlign: "center",
  },

  homeDescription: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginBottom: 25,
  },

  profileCard: {
    backgroundColor: WHITE,
    width: "100%",
    borderRadius: 20,
    padding: 20,
    marginVertical: 20,
    elevation: 3,
  },

  profileTitle: {
    color: BROWN,
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 12,
  },

  profileText: {
    color: "#333",
    fontSize: 14,
    marginBottom: 9,
  },
});