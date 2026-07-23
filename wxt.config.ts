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
    // Everything below is e2e-only and must never reach a store build.
    //
    // `key` pins a stable extension ID (dnlbkgiimhnnechipakfobidildedmoe) so the Playwright
    // test can address the popup by a known URL instead of scraping chrome://extensions. It
    // is a locally-generated dev keypair, not a signing key — and the Chrome Web Store
    // assigns its own ID, so shipping `key` in a store package invites an ID conflict.
    //
    // `host_permissions` exists because Playwright cannot fire a genuine user-gesture click
    // on the browser action, so activeTab's per-tab grant never activates and tabs.query()
    // returns the fixture tab with its `url` stripped. `<all_urls>` rather than localhost so
    // the store-screenshot tool can also render pages under realistic hostnames.
    // test/unit/manifest.test.ts asserts none of this reaches a production build.
    ...(env.mode === 'e2e'
      ? { key: DEV_KEY, host_permissions: ['<all_urls>'] }
      : {}),
  }),
});
