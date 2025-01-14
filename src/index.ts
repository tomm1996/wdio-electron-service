import ElectronLaunchService from './launcher.js';
import ElectronWorkerService from './service.js';
import type { ElectronServiceOptions } from './types.js';

/**
 * set this environment variable so that the preload script can be loaded
 */
process.env.WDIO_ELECTRON = 'true';

export const launcher = ElectronLaunchService;
export default ElectronWorkerService;
export interface BrowserExtension {
  electron: {
    api: (...arg: unknown[]) => Promise<unknown>;
    app: (funcName: string, ...arg: unknown[]) => Promise<unknown>;
    browserWindow: (funcName: string, ...arg: unknown[]) => Promise<unknown>;
    dialog: (funcName: string, ...arg: unknown[]) => Promise<unknown>;
    mainProcess: (funcName: string, ...arg: unknown[]) => Promise<unknown>;
    mock: (apiName: string, funcName: string, mockReturnValue: unknown) => Promise<unknown> | unknown;
  };
}

type WdioElectronWindowObj = {
  [Key: string]: {
    invoke: (...args: unknown[]) => Promise<unknown>;
  };
};

declare global {
  namespace WebdriverIO {
    interface Browser extends BrowserExtension {}
    interface MultiRemoteBrowser extends BrowserExtension {}
  }
  interface Window {
    wdioElectron?: WdioElectronWindowObj;
  }
  namespace WebDriver {
    interface Capabilities {
      'wdio:electronServiceOptions': ElectronServiceOptions;
    }
  }
}

export * from './types.js';
