import firebase from "@/lib/firebase/firebase";
import { getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";

const remoteConfig = getRemoteConfig(firebase.app);

// The default and recommended production fetch interval for Remote Config is 12 hours
remoteConfig.settings.minimumFetchIntervalMillis = 60 * 1000;

remoteConfig.defaultConfig = {
  isGloryShareJoinable: true,
};

export async function fetchRemoteFlags() {
  await fetchAndActivate(remoteConfig);

  return {
    isGloryShareJoinable: getValue(remoteConfig, "isGloryShareJoinable").asBoolean(),
    isGloryShareTestPrice: getValue(remoteConfig, "isGloryShareTestPrice").asBoolean(),
    // add other flags here
  };
}

export async function fetchRemoteFlag(flag: string) {
  await fetchAndActivate(remoteConfig);

  return getValue(remoteConfig, flag).asBoolean();
}
