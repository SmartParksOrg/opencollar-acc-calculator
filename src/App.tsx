import { useEffect, useState } from "react";
import { defaultConfig, type AppConfig } from "./models/config";
import { HomePage } from "./pages/HomePage";

function decodeConfigFromHash(hash: string): AppConfig | null {
  const prefix = "#cfg=";
  if (!hash.startsWith(prefix)) {
    return null;
  }

  try {
    const b64 = hash.slice(prefix.length);
    const json = atob(b64);
    const parsed = JSON.parse(json) as AppConfig;
    return parsed;
  } catch {
    return null;
  }
}

function encodeConfigToHash(config: AppConfig): string {
  const json = JSON.stringify(config);
  const b64 = btoa(json);
  return `#cfg=${b64}`;
}

export default function App(): JSX.Element {
  const [config, setConfig] = useState<AppConfig>(() => decodeConfigFromHash(window.location.hash) ?? defaultConfig);

  useEffect(() => {
    const maybe = decodeConfigFromHash(window.location.hash);
    if (maybe) {
      setConfig(maybe);
    }
  }, []);

  const copyConfig = async (): Promise<void> => {
    const text = JSON.stringify(config, null, 2);
    await navigator.clipboard.writeText(text);
  };

  const shareLink = async (): Promise<void> => {
    const hash = encodeConfigToHash(config);
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    window.location.hash = hash;
    await navigator.clipboard.writeText(url);
  };

  return <HomePage config={config} setConfig={setConfig} onCopyConfig={copyConfig} onShareLink={shareLink} />;
}
