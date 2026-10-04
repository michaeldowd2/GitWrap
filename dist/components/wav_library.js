/**
 * WavLibrary — embeddable track list that drives a WavPlayer.
 *
 * Renders a list of audio tracks into a target element. Choosing a row loads
 * that track into the player; playback stays on the player's own controls.
 *
 * No extra script dependencies. Include after wav_player.js if you want Play
 * to drive a WavPlayer on the same page.
 *
 * @example
 * // From an in-memory list:
 * const library = new WavLibrary({
 *   target: 'library',
 *   player: 'player',
 *   heading: 'Library',
 *   library: [
 *     { title, artist, description, tags, audio_url, image_url },
 *   ],
 * });
 * library.initialise();
 *
 * // From a remote CSV, .wavlib, or JSON URL:
 * const library = new WavLibrary({
 *   target: 'library',
 *   player: 'player',
 *   library: 'https://example.com/library.wavlib',
 * });
 * await library.initialise();
 *
 * Entry fields:
 *   required: audio_url (aliases: url, wav_url, mp3_url, src, procsong_url)
 *   optional: title, artist, description, tags, image_url
 *   CSV columns for description / tags / image_url may be omitted entirely,
 *   or left blank per row — both are fine.
 *
 * `library` may be:
 *   - an array of entry objects
 *   - a single entry object
 *   - a URL string ending in .json, .csv, or .wavlib (format is sniffed if unclear)
 *
 * JSON may be an array, or an object with a songs / library / entries / tracks array.
 * `.csv` and `.wavlib` are the same CSV text format.
 *
 * @param {object} options
 * @param {string|HTMLElement} options.target
 * @param {string|object|object[]} options.library
 * @param {string|HTMLElement|WavPlayer} options.player
 * @param {string} [options.heading=Library]
 */
(function (global) {
  'use strict';

  const LIBRARY_CSS = `
.wavlib {
  --wl-bg: var(--panel, #1a1a1a);
  --wl-line: var(--line, #3a3a3a);
  --wl-text: var(--text, #eee);
  --wl-muted: var(--muted, #999);
  --wl-accent: var(--accent, #ccc);
  --wl-input: var(--input-bg, #111);
  --wl-error: var(--error, #e8a090);
  --wl-sans: var(--sans, inherit);
  --wl-mono: var(--mono, ui-monospace, monospace);
  color: var(--wl-text);
  font-family: var(--wl-sans);
  margin: 0 0 10px;
}
.wavlib .wavlib-label {
  margin: 0 0 8px;
  color: var(--wl-muted);
  font-family: var(--wl-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.wavlib .wavlib-status {
  margin: 0;
  padding: 14px 16px;
  background: var(--wl-bg);
  border: 1px solid var(--wl-line);
  border-radius: 8px;
  color: var(--wl-muted);
}
.wavlib .wavlib-status.is-error { color: var(--wl-error); }
.wavlib .wavlib-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wavlib .wavlib-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--wl-bg);
  border: 1px solid var(--wl-line);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}
.wavlib .wavlib-row:hover,
.wavlib .wavlib-row.is-playing {
  border-color: var(--wl-accent);
}
.wavlib .wavlib-cover {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
  flex: 0 0 36px;
  background: var(--wl-input);
}
.wavlib .wavlib-main {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}
.wavlib .wavlib-heading {
  margin: 0;
  min-width: 0;
  flex: 1 1 8em;
  display: flex;
  align-items: baseline;
  gap: 0.4em;
  overflow: hidden;
  line-height: 1.25;
}
.wavlib .wavlib-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wavlib .wavlib-dot { color: var(--wl-muted); flex: 0 0 auto; }
.wavlib .wavlib-artist {
  color: var(--wl-muted);
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wavlib .wavlib-url {
  color: var(--wl-muted);
  font-family: var(--wl-mono);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wavlib .wavlib-tags {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
}
.wavlib .wavlib-tags li {
  border: 1px solid var(--wl-line);
  border-radius: 999px;
  padding: 1px 7px;
  color: var(--wl-muted);
  font-size: 10px;
  white-space: nowrap;
}
@media (max-width: 640px) {
  .wavlib .wavlib-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }
  .wavlib .wavlib-heading {
    flex: 0 0 auto;
    width: 100%;
    font-size: 13px;
  }
  .wavlib .wavlib-tags {
    flex: 0 0 auto;
    max-width: 100%;
    flex-wrap: wrap;
    overflow: visible;
  }
  .wavlib .wavlib-tags li { font-size: 9px; padding: 1px 6px; }
}
`;

  function ensureCss() {
    if (document.getElementById('wav-library-css')) return;
    const style = document.createElement('style');
    style.id = 'wav-library-css';
    style.textContent = LIBRARY_CSS;
    document.head.appendChild(style);
  }

  function pick(obj, ...keys) {
    if (!obj) return '';
    for (const key of keys) {
      if (obj[key] != null && String(obj[key]).trim() !== '') return obj[key];
    }
    return '';
  }

  function normalizeUrl(url) {
    if (!url) return '';
    let value = String(url).trim();
    if (/^ttps:\/\//i.test(value)) value = `h${value}`;
    return value;
  }

  function dropboxDirectUrl(url) {
    let value = String(url || '').trim();
    if (!value) return value;
    value = value.replace(
      /^https?:\/\/(?:www\.)?dropbox\.com\//i,
      'https://dl.dropboxusercontent.com/'
    );
    try {
      const parsed = new URL(value);
      if (parsed.hostname.endsWith('dropboxusercontent.com') ||
          parsed.hostname === 'dropbox.com' ||
          parsed.hostname.endsWith('.dropbox.com')) {
        if (!parsed.hostname.endsWith('dropboxusercontent.com')) {
          parsed.hostname = 'dl.dropboxusercontent.com';
        }
        parsed.searchParams.set('dl', '1');
        parsed.searchParams.delete('st');
        return parsed.toString();
      }
      return parsed.toString();
    } catch (_) {
      return value;
    }
  }

  function resolveElement(target) {
    if (!target) throw new Error('WavLibrary requires a target element or id');
    if (target instanceof Element) return target;
    const selector = String(target);
    const byId = document.getElementById(selector.replace(/^#/, ''));
    if (byId) return byId;
    const found = document.querySelector(selector);
    if (!found) throw new Error(`WavLibrary target not found: ${target}`);
    return found;
  }

  function parseTags(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
    return String(tags).split(/[;,]/).map((tag) => String(tag).trim()).filter(Boolean);
  }

  function headingText(value, fallback) {
    if (value === false || value === '') return '';
    return String(value || fallback);
  }

  function normalizeEntry(raw) {
    if (raw == null) return null;
    if (typeof raw === 'string') {
      const audioUrl = normalizeUrl(raw);
      return audioUrl
        ? { title: '', artist: '', description: '', tags: [], audioUrl, imageUrl: '' }
        : null;
    }
    if (typeof raw !== 'object') return null;
    const audioUrl = normalizeUrl(
      pick(
        raw,
        'audioUrl',
        'audio_url',
        'url',
        'wav_url',
        'mp3_url',
        'src',
        'procSongUrl',
        'proc_song_url',
        'procsong_url'
      )
    );
    if (!audioUrl) return null;
    // description, tags, and image_url are optional — missing or blank columns are OK
    const description = String(pick(raw, 'description') || '').trim();
    const imageUrl = normalizeUrl(pick(raw, 'imageUrl', 'image_url'));
    const tags = parseTags(pick(raw, 'tags') || raw.tags);
    return {
      title: String(pick(raw, 'title', 'songName', 'name', 'track') || ''),
      artist: String(pick(raw, 'artist') || ''),
      description,
      tags,
      audioUrl,
      imageUrl,
    };
  }

  function entriesFromJson(data) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      if (Array.isArray(data.songs)) return data.songs;
      if (Array.isArray(data.library)) return data.library;
      if (Array.isArray(data.entries)) return data.entries;
      if (Array.isArray(data.tracks)) return data.tracks;
      if (
        pick(
          data,
          'audioUrl',
          'audio_url',
          'url',
          'wav_url',
          'mp3_url',
          'src',
          'procSongUrl',
          'proc_song_url',
          'procsong_url'
        )
      ) {
        return [data];
      }
    }
    throw new Error('JSON library did not contain a track list');
  }

  function parseCsv(text) {
    const input = String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];
      if (inQuotes) {
        if (ch === '"') {
          if (input[i + 1] === '"') {
            cell += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          cell += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }

    const nonempty = rows.filter((item) => item.some((value) => String(value).trim() !== ''));
    if (!nonempty.length) return [];
    const header = nonempty[0].map((name) => String(name).trim().toLowerCase());
    return nonempty.slice(1).map((values) => {
      const obj = {};
      header.forEach((name, i) => {
        if (name) obj[name] = values[i] != null ? String(values[i]).trim() : '';
      });
      return obj;
    });
  }

  function pathnameOf(url) {
    try {
      return new URL(url, typeof window !== 'undefined' ? window.location.href : undefined).pathname.toLowerCase();
    } catch (_) {
      return String(url).toLowerCase();
    }
  }

  function inferFormat(url, contentType, text) {
    const path = pathnameOf(url);
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.csv') || path.endsWith('.wavlib')) return 'csv';
    const type = (contentType || '').toLowerCase();
    if (type.includes('json')) return 'json';
    if (type.includes('csv')) return 'csv';
    const start = String(text).trim()[0];
    if (start === '[' || start === '{') return 'json';
    return 'csv';
  }

  async function fetchLibrary(url) {
    const response = await fetch(dropboxDirectUrl(url));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const format = inferFormat(url, response.headers.get('content-type'), text);
    const raw = format === 'json' ? entriesFromJson(JSON.parse(text.replace(/^\uFEFF/, ''))) : parseCsv(text);
    return raw.map(normalizeEntry).filter(Boolean);
  }

  class WavLibrary {
    /**
     * @param {object} options See file header for the public API.
     */
    constructor(options = {}) {
      this.target = options.target;
      this.playerTarget = options.player;
      this.librarySource = options.library;
      this.heading = headingText(options.heading, 'Library');
      this.el = null;
      this.items = [];
      this.activeUrl = '';
      this.boundPlayer = null;
    }

    /**
     * Fetch the library if needed and render it into `options.target`.
     * @returns {Promise}
     */
    async initialise() {
      ensureCss();
      this.el = resolveElement(this.target);
      this.showStatus('Loading library…');
      this.watchPlayer();
      try {
        this.items = await this.resolveLibrary(this.librarySource);
        this.render();
      } catch (err) {
        this.showStatus(`Failed to load library: ${err.message || err}`, true);
        throw err;
      }
      return this;
    }

    /**
     * Replace the library source and re-render.
     * @param {string|object|object[]} library
     * @returns {Promise}
     */
    load(library) {
      this.librarySource = library;
      return this.initialise();
    }

    async resolveLibrary(library) {
      if (library == null || library === '') throw new Error('No library provided');
      if (typeof library === 'string') return fetchLibrary(library.trim());
      return entriesFromJson(library).map(normalizeEntry).filter(Boolean);
    }

    watchPlayer() {
      const player = this.findPlayer();
      if (!player || !player.el || this.boundPlayer === player) return;
      this.boundPlayer = player;
      player.el.addEventListener('wavplayer:play', (event) => {
        this.activeUrl = (event.detail && event.detail.audioUrl) || '';
        this.markActive();
      });
      player.el.addEventListener('wavplayer:stop', () => {
        this.activeUrl = '';
        this.markActive();
      });
    }

    findPlayer() {
      if (!this.playerTarget) return null;
      const Player = global.WavPlayer;
      if (Player && typeof Player.get === 'function') {
        const found = Player.get(this.playerTarget);
        if (found) return found;
      }
      if (typeof this.playerTarget.play === 'function') return this.playerTarget;
      return null;
    }

    headingEl() {
      if (!this.heading) return null;
      const label = document.createElement('p');
      label.className = 'wavlib-label';
      label.textContent = this.heading;
      return label;
    }

    setContent(node) {
      const wrap = document.createElement('div');
      wrap.className = 'wavlib';
      const label = this.headingEl();
      if (label) wrap.appendChild(label);
      wrap.appendChild(node);
      this.el.replaceChildren(wrap);
    }

    showStatus(message, isError) {
      const status = document.createElement('p');
      status.className = isError ? 'wavlib-status is-error' : 'wavlib-status';
      status.textContent = message;
      this.setContent(status);
    }

    render() {
      if (!this.items.length) {
        const status = document.createElement('p');
        status.className = 'wavlib-status';
        status.textContent = 'No tracks in this library.';
        this.setContent(status);
        return;
      }

      const list = document.createElement('ul');
      list.className = 'wavlib-list';
      this.items.forEach((item) => list.appendChild(this.rowEl(item)));
      this.setContent(list);
      this.markActive();
    }

    rowEl(item) {
      const row = document.createElement('li');
      row.className = 'wavlib-row';
      row.dataset.audioUrl = item.audioUrl;
      const description = item.description ? String(item.description).trim() : '';
      const imageUrl = item.imageUrl ? String(item.imageUrl).trim() : '';
      const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];
      if (description) row.title = description;

      if (imageUrl) {
        const img = document.createElement('img');
        img.className = 'wavlib-cover';
        img.alt = item.title || item.artist || 'Cover art';
        img.loading = 'lazy';
        img.src = dropboxDirectUrl(imageUrl);
        img.addEventListener('error', () => img.remove());
        row.appendChild(img);
      }

      const main = document.createElement('div');
      main.className = 'wavlib-main';

      const heading = document.createElement('p');
      heading.className = 'wavlib-heading';
      if (item.title) {
        const title = document.createElement('span');
        title.className = 'wavlib-title';
        title.textContent = item.title;
        heading.appendChild(title);
      }
      if (item.title && item.artist) {
        const dot = document.createElement('span');
        dot.className = 'wavlib-dot';
        dot.textContent = '•';
        heading.appendChild(dot);
        const artist = document.createElement('span');
        artist.className = 'wavlib-artist';
        artist.textContent = item.artist;
        heading.appendChild(artist);
      } else if (!item.title && item.artist) {
        const artist = document.createElement('span');
        artist.className = 'wavlib-title';
        artist.textContent = item.artist;
        heading.appendChild(artist);
      } else if (!item.title && !item.artist) {
        const url = document.createElement('span');
        url.className = 'wavlib-url';
        url.textContent = item.audioUrl;
        heading.appendChild(url);
      }
      main.appendChild(heading);

      if (tags.length) {
        const tagsEl = document.createElement('ul');
        tagsEl.className = 'wavlib-tags';
        tags.forEach((tag) => {
          const li = document.createElement('li');
          li.textContent = tag;
          tagsEl.appendChild(li);
        });
        main.appendChild(tagsEl);
      }

      row.appendChild(main);

      const start = () => {
        this.playItem(item).catch(() => {});
      };
      row.addEventListener('click', start);
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          start();
        }
      });
      row.tabIndex = 0;
      row.setAttribute('aria-label', item.title || 'Audio track');
      return row;
    }

    markActive() {
      if (!this.el) return;
      this.el.querySelectorAll('.wavlib-row').forEach((row) => {
        row.classList.toggle('is-playing', Boolean(this.activeUrl) && row.dataset.audioUrl === this.activeUrl);
      });
    }

    async playItem(item) {
      const player = this.findPlayer();
      if (!player || typeof player.play !== 'function') {
        throw new Error('No wav player found. Pass the player target id as `player`.');
      }
      this.watchPlayer();
      await player.play({
        title: item.title,
        artist: item.artist,
        imageUrl: item.imageUrl,
        description: item.description,
        tags: item.tags,
        audioUrl: item.audioUrl,
      });
      this.activeUrl = item.audioUrl;
      this.markActive();
    }
  }

  global.WavLibrary = WavLibrary;
})(typeof window !== 'undefined' ? window : this);
