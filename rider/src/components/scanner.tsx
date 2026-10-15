import { useEffect, useRef } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { loadCamera } from '../lib/camera';
import { colors, fonts } from '../lib/theme';

// The live camera behind the pickup viewfinder, reading QR codes. Only rendered when loadCamera()
// found the native module, so the hooks below always run the same way.
export function Scanner({ torch, onCode }: { torch: boolean; onCode: (data: string) => void }) {
  const cam = loadCamera()!;
  const [permission, ask] = cam.useCameraPermissions();
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void ask();
  }, [permission, ask]);
  // The camera reports the same code many times a second; pass each one on once per 3 seconds.
  const last = useRef({ data: '', at: 0 });

  if (!permission?.granted) {
    return (
      <View style={[StyleSheet.absoluteFill, s.blocked]}>
        <Text style={s.text}>Allow the camera to scan bag codes.</Text>
        <Pressable accessibilityRole="button" onPress={() => (permission?.canAskAgain === false ? Linking.openSettings() : ask())} style={s.allow}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.forest }}>{permission?.canAskAgain === false ? 'Open settings' : 'Allow camera'}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <cam.CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      enableTorch={torch}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={({ data }) => {
        const now = Date.now();
        if (data === last.current.data && now - last.current.at < 3000) return;
        last.current = { data, at: now };
        onCode(data);
      }}
    />
  );
}

const s = StyleSheet.create({
  blocked: { alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: colors.viewfinder },
  text: { fontFamily: fonts.regular, fontSize: 15, color: colors.onForest, textAlign: 'center' },
  allow: { height: 46, paddingHorizontal: 22, borderRadius: 23, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
});
