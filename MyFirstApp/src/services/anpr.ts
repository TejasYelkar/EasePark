import { API_BASE_URL } from './parking-slots';

const configuredAnprUrl = process.env.EXPO_PUBLIC_ANPR_API_URL?.trim();
export const ANPR_BASE_URL = (
  configuredAnprUrl || API_BASE_URL.replace(/:\d+$/, ':8000')
).replace(/\/+$/, '');

export type PlateRecognitionResult = {
  success: boolean;
  plateNumber: string | null;
  detectionConfidence?: number;
  message: string;
};

export async function recognizePlate(imageUri: string): Promise<PlateRecognitionResult> {
  const formData = new FormData();
  formData.append(
    'file',
    {
      uri: imageUri,
      name: 'vehicle.jpg',
      type: 'image/jpeg',
    } as unknown as Blob
  );

  let response: Response;
  try {
    response = await fetch(`${ANPR_BASE_URL}/anpr/recognize`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error(
      `Could not connect to the ANPR server at ${ANPR_BASE_URL}.`
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok || !payload || typeof payload !== 'object') {
    throw new Error(`ANPR server returned HTTP ${response.status}.`);
  }

  const result = payload as Partial<PlateRecognitionResult>;
  if (
    typeof result.success !== 'boolean' ||
    (result.plateNumber !== null && typeof result.plateNumber !== 'string') ||
    typeof result.message !== 'string'
  ) {
    throw new Error('ANPR server returned an invalid recognition response.');
  }

  return result as PlateRecognitionResult;
}
