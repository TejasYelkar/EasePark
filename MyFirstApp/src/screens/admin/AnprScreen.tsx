import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { recognizePlate, type PlateRecognitionResult } from '@/services/anpr';
import { createUnregisteredVehicle } from '@/services/parking-bookings';

const COLORS = {
  navy: '#082D68',
  yellow: '#F5C400',
  background: '#F5F7FC',
  white: '#FFFFFF',
  text: '#101828',
  muted: '#64748B',
  red: '#B42318',
  green: '#16834A',
};

export default function AnprScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [result, setResult] = useState<PlateRecognitionResult | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<'2 Wheeler' | '4 Wheeler' | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  async function scanPlate() {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    setResult(null);
    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (!picture?.uri) {
        throw new Error('The camera did not return an image.');
      }
      const recognition = await recognizePlate(picture.uri);
      setResult(recognition);
    } catch (error) {
      Alert.alert(
        'ANPR Scan Failed',
        error instanceof Error ? error.message : 'Could not scan the number plate.'
      );
    } finally {
      setIsCapturing(false);
    }
  }

  async function saveUnregisteredVehicle() {
    if (!result?.plateNumber) return;
    if (!ownerName.trim() || !mobileNumber || !vehicleType) {
      Alert.alert('Missing details', 'Enter the owner name, mobile number, and vehicle type.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      Alert.alert('Invalid mobile number', 'Enter a valid 10-digit mobile number.');
      return;
    }

    setIsSaving(true);
    try {
      await createUnregisteredVehicle({
        plateNumber: result.plateNumber,
        ownerName,
        mobileNumber,
        vehicleType,
      });
      Alert.alert('Vehicle saved', 'The temporary vehicle was saved in the database.', [
        { text: 'OK', onPress: onBack },
      ]);
    } catch (error) {
      Alert.alert(
        'Could not save vehicle',
        error instanceof Error ? error.message : 'The vehicle could not be saved.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator color={COLORS.navy} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-outline" size={54} color={COLORS.navy} />
        <Text style={styles.title}>Camera permission required</Text>
        <Text style={styles.message}>
          Allow camera access to scan a vehicle number plate.
        </Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Allow Camera</Text>
        </Pressable>
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>Back to dashboard</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={25} color={COLORS.white} />
        </Pressable>
        <Text style={styles.headerTitle}>ANPR Vehicle Scan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.cameraFrame}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        <View pointerEvents="none" style={styles.scanGuide}>
          <View style={styles.scanGuideInner} />
          <Text style={styles.guideText}>Place the number plate inside the frame</Text>
        </View>
      </View>

      <View style={styles.controls}>
        {result?.success && result.plateNumber ? (
          <>
            <Text style={styles.successText}>{result.message}</Text>
            <Text style={styles.plate}>{result.plateNumber}</Text>
            {result.detectionConfidence !== undefined && (
              <Text style={styles.confidence}>
                Detection confidence: {result.detectionConfidence}%
              </Text>
            )}
          </>
        ) : (
          <>
            {result && <Text style={styles.errorText}>{result.message}</Text>}
            <Pressable style={styles.scanButton} onPress={scanPlate} disabled={isCapturing}>
              {isCapturing ? (
                <ActivityIndicator color={COLORS.navy} />
              ) : (
                <>
                  <Ionicons name="scan-outline" size={22} color={COLORS.navy} />
                  <Text style={styles.scanButtonText}>Scan Number Plate</Text>
                </>
              )}
            </Pressable>
          </>
        )}
        {result?.success && result.plateNumber && (
          <View style={styles.detailsForm}>
            <Text style={styles.formTitle}>Temporary vehicle details</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Owner name"
              placeholderTextColor={COLORS.muted}
              value={ownerName}
              onChangeText={setOwnerName}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Mobile number"
              placeholderTextColor={COLORS.muted}
              keyboardType="phone-pad"
              maxLength={10}
              value={mobileNumber}
              onChangeText={(value) => setMobileNumber(value.replace(/\D/g, ''))}
            />
            <Text style={styles.formLabel}>Vehicle type</Text>
            <View style={styles.typeRow}>
              {(['2 Wheeler', '4 Wheeler'] as const).map((type) => (
                <Pressable
                  key={type}
                  style={[styles.typeButton, vehicleType === type && styles.typeButtonSelected]}
                  onPress={() => setVehicleType(type)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      vehicleType === type && styles.typeButtonTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.primaryButton, isSaving && styles.disabledButton]}
              onPress={saveUnregisteredVehicle}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={COLORS.navy} />
              ) : (
                <Text style={styles.primaryButtonText}>Save Vehicle</Text>
              )}
            </Pressable>
          </View>
        )}
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={COLORS.navy} />
          <Text style={styles.backButtonText}>Back to Main Screen</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 72,
    paddingHorizontal: 20,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 18,
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
  },
  headerSpacer: { width: 25 },
  cameraFrame: {
    height: '58%',
    margin: 18,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#111827',
  },
  camera: { flex: 1 },
  scanGuide: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanGuideInner: {
    width: '82%',
    height: 86,
    borderWidth: 3,
    borderColor: COLORS.yellow,
    borderRadius: 10,
  },
  guideText: {
    marginTop: 16,
    paddingHorizontal: 12,
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: '700',
  },
  controls: { alignItems: 'center', paddingHorizontal: 24 },
  detailsForm: { width: '100%', marginTop: 16 },
  formTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  formInput: {
    height: 48,
    marginTop: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: '#D8DEE9',
  },
  formLabel: { marginTop: 12, color: COLORS.muted, fontWeight: '700' },
  typeRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8DEE9',
    backgroundColor: COLORS.white,
  },
  typeButtonSelected: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
  typeButtonText: { color: COLORS.text, fontWeight: '700' },
  typeButtonTextSelected: { color: COLORS.navy },
  disabledButton: { opacity: 0.6 },
  title: { marginTop: 18, color: COLORS.text, fontSize: 20, fontWeight: '800' },
  message: {
    marginTop: 10,
    marginBottom: 20,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
  scanButton: {
    minWidth: 220,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  scanButtonText: { color: COLORS.navy, fontSize: 15, fontWeight: '800' },
  primaryButton: {
    minWidth: 220,
    marginTop: 16,
    paddingHorizontal: 22,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: COLORS.navy, fontWeight: '800' },
  backButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  backButtonText: { color: COLORS.navy, fontWeight: '700' },
  backLink: { marginTop: 20, color: COLORS.navy, fontWeight: '700' },
  successText: { color: COLORS.green, fontWeight: '700' },
  errorText: { marginBottom: 12, color: COLORS.red, textAlign: 'center' },
  plate: {
    marginTop: 8,
    color: COLORS.text,
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: 2,
  },
  confidence: { marginTop: 4, color: COLORS.muted },
});
