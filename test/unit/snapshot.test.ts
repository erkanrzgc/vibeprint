import { afterEach, describe, expect, it } from 'vitest';
import { collectPageSnapshot } from '../../src/detection/snapshot';

function setDom(html: string): void {
  document.head.innerHTML = '';
  document.body.innerHTML = html;
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('collectPageSnapshot', () => {
  it('collects the generator meta tag, favicon, and script srcs', () => {
    document.head.innerHTML =
      '<meta name="generator" content="Framer">' +
      '<link rel="icon" href="/favicon.png">' +
      '<script src="https://cdn.gpteng.co/gptengineer.js"></script>';
    document.title = 'My Site';

    const snapshot = collectPageSnapshot(document, { hostname: 'example.com' });

    expect(snapshot.generatorMeta).toBe('Framer');
    expect(snapshot.faviconHref).toBe('/favicon.png');
    expect(snapshot.scriptSrcs).toContain('https://cdn.gpteng.co/gptengineer.js');
    expect(snapshot.hostname).toBe('example.com');
    expect(snapshot.title).toBe('My Site');
  });

  it('returns null for a missing generator meta tag and favicon', () => {
    setDom('<p>hi</p>');

    const snapshot = collectPageSnapshot(document, { hostname: 'example.com' });

    expect(snapshot.generatorMeta).toBeNull();
    expect(snapshot.faviconHref).toBeNull();
  });

  it('collects data-* attribute keys from html and body separately', () => {
    document.documentElement.setAttribute('data-framer-hydrate-v2', 'true');
    setDom('<div></div>');
    document.body.setAttribute('data-framer-root-width', '1200');

    const snapshot = collectPageSnapshot(document, { hostname: 'example.com' });

    expect(snapshot.htmlDatasetKeys).toContain('framerHydrateV2');
    expect(snapshot.bodyDatasetKeys).toContain('framerRootWidth');

    document.documentElement.removeAttribute('data-framer-hydrate-v2');
  });

  it('collects component dataset keys only from a fixed candidate list', () => {
    setDom(
      '<button data-slot="button" data-state="active">Click</button>' +
        '<div data-custom-thing="x"></div>',
    );

    const snapshot = collectPageSnapshot(document, { hostname: 'example.com' });

    expect(snapshot.componentDatasetKeys.sort()).toEqual(['slot', 'state']);
  });

  it.each(['mailto:jane.doe@example.com', 'tel:+441865000000'])(
    'does not collect %s links',
    (href) => {
      // A builder badge always points at a website, so these can never be one. Collecting
      // them would only rake third-party contact details into the snapshot for no gain.
      setDom(`<a href="${href}">Contact</a><a href="https://replit.com">Made in Replit</a>`);

      const snapshot = collectPageSnapshot(document, { hostname: 'example.com' });

      expect(snapshot.badgeLinks).toEqual([
        { href: 'https://replit.com/', text: 'Made in Replit' },
      ]);
    },
  );

  it('collects badge-like short anchor links with href and text', () => {
    setDom('<a href="https://replit.com">Made in Replit</a>');

    const snapshot = collectPageSnapshot(document, { hostname: 'example.com' });

    expect(snapshot.badgeLinks).toContainEqual({
      href: 'https://replit.com/',
      text: 'Made in Replit',
    });
  });

  it('collects image srcs', () => {
    setDom('<img src="/lovable-uploads/abc.png">');

    const snapshot = collectPageSnapshot(document, { hostname: 'example.com' });

    expect(snapshot.imageSrcs).toContain('/lovable-uploads/abc.png');
  });

  it('drops inline data: image URIs, which carry no path fingerprint but can be enormous', () => {
    const hugeDataUri = `data:image/png;base64,${'A'.repeat(5000)}`;
    setDom(`<img src="${hugeDataUri}"><img src="/real-image.png">`);

    const snapshot = collectPageSnapshot(document, { hostname: 'example.com' });

    expect(snapshot.imageSrcs).toEqual(['/real-image.png']);
  });

  it('caps script srcs so a pathological page cannot balloon the snapshot message', () => {
    setDom(
      Array.from({ length: 250 }, (_, i) => `<script src="/chunk-${i}.js"></script>`).join(''),
    );

    const snapshot = collectPageSnapshot(document, { hostname: 'example.com' });

    expect(snapshot.scriptSrcs).toHaveLength(200);
    // Document order is preserved, so early-loading builder runtimes survive the cap.
    expect(snapshot.scriptSrcs[0]).toBe('/chunk-0.js');
  });

  it('collects a truncated body text sample', () => {
    setDom('<p>Hello world, this is the visible page text.</p>');

    const snapshot = collectPageSnapshot(document, { hostname: 'example.com' });

    expect(snapshot.bodyTextSample).toContain('Hello world, this is the visible page text.');
  });

  it('redacts email addresses from the body text sample', () => {
    // The text sample is only ever used for buzzword counting, so addresses carry no
    // detection value - but snapshots get committed to the corpus and the extension reads
    // whatever page the user is on. Scraping personal contact details into a repo (or even
    // just into a message) is not something this tool should ever do.
    setDom('<p>Contact jane.doe@example.com or hello@example.co.uk to revolutionize things.</p>');

    const snapshot = collectPageSnapshot(document, { hostname: 'example.com' });

    expect(snapshot.bodyTextSample).not.toContain('jane.doe@example.com');
    expect(snapshot.bodyTextSample).not.toContain('hello@example.co.uk');
    expect(snapshot.bodyTextSample).toContain('[email]');
    // Surrounding copy must survive, otherwise the buzzword heuristic loses signal.
    expect(snapshot.bodyTextSample).toContain('revolutionize');
  });

  it('skips a malformed href instead of throwing and aborting the whole snapshot', () => {
    setDom('<a href="http://[">bad link</a><a href="https://replit.com">Made in Replit</a>');

    const snapshot = collectPageSnapshot(document, { hostname: 'example.com' });

    expect(snapshot.badgeLinks).toEqual([{ href: 'https://replit.com/', text: 'Made in Replit' }]);
  });
});
