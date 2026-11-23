import { app } from 'electron'

export function configureIntranetChromium(): void {
  for (const name of [
    'disable-background-networking',
    'disable-component-update',
    'disable-domain-reliability',
    'disable-sync',
    'disable-client-side-phishing-detection',
    'dns-prefetch-disable',
    'no-pings',
    'disable-quic'
  ]) {
    app.commandLine.appendSwitch(name)
  }
  app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp')
}
