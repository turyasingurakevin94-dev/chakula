import { useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccount } from '../lib/account';
import { DONE_SCHEME, hasWebView, setPaySheetListener, type PayPage } from '../lib/payPage';
import { colors, fonts } from '../lib/theme';
import { IconButton } from './ui';

// Flutterwave's MoMo page on our own sheet, so paying never leaves Chakula. It closes when
// Flutterwave sends the student back to /payments/done, or as soon as the server sees the order
// paid or the wallet top-up settled (the webhook can beat the page). Only mounted on APKs that
// have WebView's native code.

type WebViewProps = {
  source: { uri: string };
  style?: object;
  startInLoadingState?: boolean;
  renderLoading?: () => React.ReactElement;
  onShouldStartLoadWithRequest?: (req: { url: string }) => boolean;
  setSupportMultipleWindows?: boolean;
};

function loadWebView(): ComponentType<WebViewProps> | null {
  if (!hasWebView()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('react-native-webview') as { WebView: ComponentType<WebViewProps> }).WebView;
  } catch {
    return null;
  }
}
const Web = loadWebView();

const isDone = (url: string) => url.startsWith(DONE_SCHEME) || /\/payments\/done(\?|$)/.test(url);

export function PaySheet() {
  const [page, setPage] = useState<PayPage | null>(null);
  const { orders, topups } = useAccount();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!Web) return;
    setPaySheetListener(setPage);
    return () => setPaySheetListener(null);
  }, []);

  // Paid (or cancelled) on the server: nothing left to do on the page.
  const order = page?.orderId ? orders.find((o) => o.serverId === page.orderId) : undefined;
  const orderSettled = !!page?.orderId && (!order || (order.status !== undefined && order.status !== 'awaiting_payment'));
  const topupSettled = !!page?.topupId && !!topups[page.topupId] && topups[page.topupId] !== 'pending';
  const visible = !!page && !orderSettled && !topupSettled;

  if (!Web) return null;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPage(null)}>
      <View style={{ flex: 1, backgroundColor: colors.cream, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.forest }}>{page?.topupId ? 'Top up your wallet' : 'Pay with mobile money'}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 }}>Approve on your phone. This closes once it’s paid.</Text>
          </View>
          <IconButton icon="x" label="Close" variant="outline" size={40} onPress={() => setPage(null)} />
        </View>
        {page ? (
          <Web
            source={{ uri: page.url }}
            style={{ flex: 1, backgroundColor: colors.cream }}
            setSupportMultipleWindows={false}
            startInLoadingState
            renderLoading={() => (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
                <ActivityIndicator color={colors.forest} />
              </View>
            )}
            onShouldStartLoadWithRequest={(req) => {
              if (!isDone(req.url)) return true;
              setPage(null);
              return false;
            }}
          />
        ) : null}
      </View>
    </Modal>
  );
}
