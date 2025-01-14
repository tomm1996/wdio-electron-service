# WDIO Electron Service

**WebdriverIO service for testing Electron applications**

Enables cross-platform E2E testing of Electron apps via the extensive WebdriverIO ecosystem. Adds Electron-specific browser capabilities and handles chromedriver execution.

Spiritual successor to [Spectron](https://github.com/electron-userland/spectron) ([RIP](https://github.com/electron-userland/spectron/issues/1045)).

## Installation

```bash
npm install --dev wdio-electron-service
```

Or use your package manager of choice - pnpm, yarn, etc.

You will need to install `WebdriverIO`, instructions can be found [here.](https://webdriver.io/docs/gettingstarted)

### Chromedriver

`wdio-electron-service` needs Chromedriver to work. The Chromedriver version needs to be appropriate for the version of Electron that your app was built with, you can either manage this yourself or let the service handle it.

#### User Managed

If you prefer to manage Chromedriver yourself you can install it directly or via some other means like [`electron-chromedriver`](https://github.com/electron/chromedriver), in this case you will need to tell WebdriverIO where your Chromedriver binary is through its custom [`wdio:chromedriverOptions`](https://webdriver.io/docs/capabilities#webdriverio-capabilities-to-manage-browser-driver-options) capability.

#### Service Managed

If you are not specifying a Chromedriver binary then the service will download and use the appropriate version for your app's Electron version. The Electron version of your app is determined by the version of Electron in your `package.json`, however you may want to override this behaviour - for instance, if the app you are testing is in a different repo from the tests. You can specify the Electron version manually by setting the `browserVersion` capability, as shown in the example configuration below.

## Example Configuration

To use the service you need to add `electron` to your services array and set an Electron capability with the path to your application bundle, e.g.:

```js
// wdio.conf.js
import url from 'node:url';
import path from 'node:path';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export const config = {
  outputDir: 'logs',
  // ...
  services: ['electron'],
  capabilities: [
    {
      browserName: 'electron',
      'wdio:electronServiceOptions': {
        appBinaryPath: path.resolve(__dirname, 'dist', 'myElectronApplication.exe'),
      },
    },
  ],
  // ...
};
```

If you are utilizing [`electron-builder`](https://www.electron.build/), your configuration might resemble the following:

```js
// wdio.conf.js
import url from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { getBinaryPath } from 'wdio-electron-service/utils';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const pkg = JSON.parse(await fs.readFile('./package.json'));

export const config = {
  outputDir: 'logs',
  // ...
  services: ['electron'],
  capabilities: [
    {
      browserName: 'electron',
      browserVersion: '26.2.2', // optional override
      'wdio:electronServiceOptions': {
        // Use `getBinaryPath` to point to the right binary, e.g. given your `productName` is "myElectronApplication"
        // it would set the binary depending on your OS to:
        //
        // Linux: ./dist/linux-unpacked/myElectronApplication
        // MacOS: ./dist/mac-arm64/myElectronApplication.app/Contents/MacOS/myElectronApplication
        // Windows: ./win-unpacked/myElectronApplication.exe
        appBinaryPath: getBinaryPath(__dirname, pkg.build.productName),
        appArgs: ['foo', 'bar=baz'],
      },
    },
  ],
  // ...
};
```

### API Configuration

If you wish to use the Electron APIs then you will need to import (or require) the preload and main scripts in your app. Somewhere near the top of your preload:

```ts
if (isTest) {
  import('wdio-electron-service/preload');
}
```

And somewhere near the top of your main index file (app entry point):

```ts
if (isTest) {
  import('wdio-electron-service/main');
}
```

The APIs should not work outside of WDIO but for security reasons it is encouraged to use dynamic imports wrapped in conditionals to ensure the APIs are only exposed when the app is being tested.

After importing the scripts the APIs should now be available in tests.

Currently available APIs: [`app`](https://www.electronjs.org/docs/latest/api/app), [`browserWindow`](https://www.electronjs.org/docs/latest/api/browser-window), [`dialog`](https://www.electronjs.org/docs/latest/api/dialog), [`mainProcess`](https://www.electronjs.org/docs/latest/api/process).

The service re-exports the WDIO browser object with the `.electron` namespace for API usage in your tests:

```ts
import { browser } from 'wdio-electron-service';

// in a test
const appName = await browser.electron.app('getName');
```

### Mocking Electron APIs

You can mock Electron API functionality by calling the mock function with the API name, function name and mock return value. e.g. in a spec file:

```ts
await browser.electron.mock('dialog', 'showOpenDialog', 'dialog opened!');
const result = await browser.electron.dialog('showOpenDialog');
console.log(result); // 'dialog opened!'
```

### Custom Electron API

You can also implement a custom API if you wish. To do this you will need to define a handler in your main process:

```ts
import { ipcMain } from 'electron';

ipcMain.handle('wdio-electron', () => {
  // access some Electron or Node things on the main process
  return 'such api';
});
```

The custom API can then be called in a spec file:

```ts
const someValue = await browser.electron.api('wow'); // default
const someValue = await browser.electron.myCustomAPI('wow'); // configured using `customApiBrowserCommand`
```

### Example

See the [Example App](./example/app/) and [E2Es](./example/e2e/) for an example of "real-world" usage in testing a minimal Electron app.

## Configuration

Configurations required to connect WebdriverIO with your Electron application can be applied by setting `wdio:electronServiceOptions` either on the service level or capability level, in which capability level configurations take precedence, e.g. the following WebdriverIO configuration:

```ts
export const config = {
  // ...
  services: [
    [
      'electron',
      {
        appBinaryPath: '/foo/bar/myApp'
      },
    ],
  ],
  capabilities: [
    {
      'browserName': 'electron',
      'wdio:electronServiceOptions': {
        appBinaryPath: '/foo/bar/myOtherApp'
        appArgs: ['foo', 'bar'],
      },
    },
  ],
  // ...
};
```

This results in the following configuration object used for given capability:

```js
{
  appBinaryPath: '/foo/bar/myOtherApp',
  appArgs: ['foo', 'bar']
}
```

This service supports the following configuration options:

### `appBinaryPath`:

The path to the Electron binary of the app for testing. If you were using the `appPath` / `appName` approach from previous versions of the service for an app utilising `electron-builder`, you should use the [`getBinaryPath`](./src/utils.ts) util to generate the appropriate `appBinaryPath` value, as shown in the [example configuration](#example-configuration) above.

Type: `string`

### `appArgs`:

An array of string arguments to be passed through to the app on execution of the test run. Electron [command line switches](https://www.electronjs.org/docs/latest/api/command-line-switches) and some [Chromium switches](https://peter.sh/experiments/chromium-command-line-switches) can be used here.

Type: `string[]`

### `customApiBrowserCommand`

The browser command used to access the custom electron API.

Type: `string`  
Default: `'api'`

## Chromedriver configuration

You can make updates to the Chromedriver configuration through the WebdriverIO custom [`wdio:chromedriverOptions`](https://webdriver.io/docs/capabilities#webdriverio-capabilities-to-manage-browser-driver-options) capability.

## Support

If you are having issues running WDIO you should open a discussion in the [main WDIO forum](https://github.com/webdriverio/webdriverio/discussions) in the first instance.

The Electron service discussion forum is much less active than the WDIO one, but if the issue you are experiencing is specific to Electron or using the service then you can open a discussion [here](https://github.com/webdriverio-community/wdio-electron-service/discussions).

## Common Issues

### DevToolsActivePort file doesn't exist

This is a Chromium error which may appear when using Docker or CI. Most of the "fixes" discussed online are based around passing different combinations of args to Chromium - you can set these via [`appArgs`](#appargs-string), though in most cases using xvfb has proven to be more effective; the service itself uses a [github action](https://github.com/coactions/setup-xvfb) to achieve this when running E2Es on CI.

See this [discussion](https://github.com/webdriverio-community/wdio-electron-service/discussions/60) for more details.
