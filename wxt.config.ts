import { defineConfig } from 'wxt';

const DEV_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp1YRHJ8sC+xHGBC1m/HD9UceaQ1fEQuBiAWus2ylvQ47Vm9Zf3J6sg2f6cvYQtuFhzca/9FBNT8qpxWY3ZnJ0rJL5yX6csQGnRpfXLqkMAB4yJaxv1IeRJdgzzpx969RHXNbr6Yd4gFizGOyq7WuhR53tmIg4qzN0UUaffTumXLwstQU6v3b6Q6oMQcBFKOkjYTtqm0wj8ouw2ZA9gxhEKGmaAJ1CVV2ZKAVWdAKmxNc5tcRZ4I/dB++dL+XML3iWfySXkCx+9uvB/ggJ3JEJmTU58bavGDXk4y9aOXVIzIEsQ+8Ctmj5/Oy8s1wmK0Mt2TYKNW3gIU8NPTHvMDJkwIDAQAB';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: (env) => ({
    name: 'Vibeprint',
    description:
      'Scans the current page on demand for signals that it was built with an AI coding tool or no-code AI app builder.',
    permissions: ['activeTab', 'scripting'],
    // Pins a stable extension ID (dnlbkgiimhnnechipakfobidildedmoe) across unpacked
    // rebuilds. This is a locally-generated dev keypair, not a Chrome Web Store signing
    // key — it only exists so the Playwright e2e test can address the extension by a known
    // ID instead of scraping it out of chrome://extensions.
    key: DEV_KEY,
    // Playwright can't trigger a genuine user-gesture click on the browser action, so
    // activeTab's temporary per-tab grant never activates in the e2e test - tabs.query()
    // would see the fixture tab but with its `url` stripped out. This host_permission is
    // ONLY added for `wxt build --mode e2e` (see package.json's test:e2e script); the real
    // `build`/`zip` scripts run in "production" mode and never include it.
    ...(env.mode === 'e2e' ? { host_permissions: ['http://localhost/*'] } : {}),
  }),
});
