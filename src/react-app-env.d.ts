/// <reference types="react-scripts" />
import { ExternalProvider } from "@ethersproject/providers";

declare global {
  interface Window {
    ethereum?: ExternalProvider;
  }
}

type ExtensionForProvider = {
  on: (event: string, callback: (...params: any) => void) => void;
  removeListener: (event: string, callback: (...params: any) => void) => void;
};
type EthersProvider = ExternalProvider & ExtensionForProvider;
