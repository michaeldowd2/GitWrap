/**
 * WavPlayer — embeddable web player for WAV / MP3 (and other browser-audio) URLs.
 *
 * Drop-in component: give it a target element and (optionally) track metadata,
 * then call initialise() to render and play() to start audio.
 *
 * No extra script dependencies.
 *
 * @example
 * const player = new WavPlayer({
 *   target: 'player',
 *   title: 'Demo Track',
 *   artist: 'Someone',
 *   audioUrl: 'https://….mp3',
 *   heading: 'Player', // empty string hides it
 * });
 * player.initialise();
 * await player.play();
 * player.stop();
 *
 * Switch track (e.g. from WavLibrary):
 * await player.play({ title, artist, imageUrl, description, tags, audioUrl });
 *
 * Look up a player by the element it was rendered into:
 * WavPlayer.get('player')
 *
 * Events dispatched on the target element:
 *   wavplayer:play  { title, artist, imageUrl, description, tags, audioUrl }
 *   wavplayer:stop
 *
 * @param {object} options
 * @param {string|HTMLElement} options.target
 * @param {string} [options.title]
 * @param {string} [options.artist]
 * @param {string} [options.imageUrl]
 * @param {string} [options.description]
 * @param {string|string[]} [options.tags]
 * @param {string} [options.audioUrl]
 * @param {string} [options.heading=Player]
 */
(function (global) {
  'use strict';

  const instances = new WeakMap();

  const PLAYER_CSS = `
.wav-player {
  --wp-bg: var(--panel, #1a1a1a);
  --wp-line: var(--line, #3a3a3a);
  --wp-text: var(--text, #eee);
  --wp-muted: var(--muted, #999);
  --wp-accent: var(--accent, #ccc);
  --wp-btn-text: var(--on-accent, var(--bg, #111));
  --wp-input: var(--input-bg, #111);
  --wp-playbar: var(--transport-play, var(--secondary, #5ee0ff));
  --wp-load: var(--transport-load, #e2b15a);
  --wp-error: var(--error, #e8a090);
  --wp-sans: var(--sans, inherit);
  --wp-mono: var(--mono, ui-monospace, monospace);
  color: var(--wp-text);
  font-family: var(--wp-sans);
  margin: 0 0 10px;
  min-width: 0;
  max-width: 100%;
}
.wav-player .wp-label {
  margin: 0 0 8px;
  color: var(--wp-muted);
  font-family: var(--wp-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.wav-player .wp-box {
  position: relative;
  background: var(--wp-bg);
  border: 1px solid var(--wp-line);
  border-radius: 8px;
  padding: 18px 18px 14px;
  min-width: 0;
  max-width: 100%;
}
.wav-player .wp-now {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 148px;
  align-items: stretch;
  gap: 12px 16px;
  min-width: 0;
}
.wav-player .wp-identity {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.wav-player .wp-heading {
  margin: 0;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.35em;
  line-height: 1.2;
}
.wav-player .wp-title {
  font-size: 1.25rem;
  font-weight: 600;
  overflow-wrap: break-word;
}
.wav-player .wp-dot { color: var(--wp-muted); flex: 0 0 auto; }
.wav-player .wp-artist {
  color: var(--wp-muted);
  font-weight: 400;
  font-size: 1rem;
  overflow-wrap: break-word;
}
.wav-player .wp-subtitle {
  margin: 6px 0 0;
  color: var(--wp-muted);
  font-size: 0.95rem;
}
.wav-player .wp-subtitle.is-url {
  font-family: var(--wp-mono);
  font-size: 12px;
  word-break: break-all;
}
.wav-player .wp-desc {
  margin: 8px 0 0;
  color: var(--wp-muted);
  font-size: 13px;
  line-height: 1.4;
  overflow-wrap: break-word;
}
.wav-player .wp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: auto 0 0;
  padding: 8px 0 0;
  list-style: none;
}
.wav-player .wp-tags li {
  border: 1px solid var(--wp-line);
  border-radius: 999px;
  padding: 1px 8px;
  color: var(--wp-muted);
  font-size: 10px;
}
.wav-player .wp-empty {
  margin: 0;
  color: var(--wp-muted);
  font-size: 1rem;
}
.wav-player .wp-controls-col {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: stretch;
  gap: 8px;
  min-width: 0;
}
.wav-player .wp-transport-btns {
  display: flex;
  align-items: stretch;
  gap: 6px;
  width: 100%;
}
.wav-player button {
  background: var(--wp-accent);
  color: var(--wp-btn-text);
  border: 0;
  border-radius: 4px;
  padding: 8px 14px;
  font: 600 13px/1 var(--wp-sans);
  cursor: pointer;
}
.wav-player button.secondary {
  background: transparent;
  color: var(--wp-text);
  border: 1px solid var(--wp-line);
}
.wav-player button:disabled { opacity: 0.45; cursor: default; }
.wav-player .wp-play,
.wav-player .wp-stop {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  height: 32px;
}
.wav-player .wp-play {
  flex: 1;
  min-width: 0;
  border-radius: 999px;
  font-family: var(--wp-mono);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.wav-player .wp-play svg {
  width: 16px;
  height: 16px;
  margin-left: 2px;
  fill: currentColor;
}
.wav-player .wp-play .wp-clock { display: none; }
.wav-player .wp-play.is-playing .wp-play-icon { display: none; }
.wav-player .wp-play.is-playing .wp-clock { display: flex; }
.wav-player .wp-stop {
  flex: 0 0 32px;
  width: 32px;
  border-radius: 50%;
}
.wav-player .wp-stop svg {
  width: 12px;
  height: 12px;
  fill: currentColor;
}
.wav-player .wp-volume {
  margin-top: auto;
  line-height: 0;
  width: 100%;
}
.wav-player .wp-volume input {
  width: 100%;
  accent-color: var(--wp-accent);
  display: block;
}
.wav-player .wp-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  min-height: 28px;
}
.wav-player .wp-status {
  margin: 0;
  color: var(--wp-muted);
  font-size: 13px;
  min-width: 0;
  flex: 0 1 auto;
}
.wav-player .wp-status.is-error { color: var(--wp-error); }
.wav-player .wp-status:empty { display: none; }
.wav-player.is-downloading .wp-status {
  color: var(--wp-load);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.wav-player.is-downloading-unknown .wp-status {
  animation: wp-pulse 1.1s ease-in-out infinite;
}
@keyframes wp-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
.wav-player.is-downloading .wp-progress {
  pointer-events: none;
  accent-color: var(--wp-load);
  cursor: progress;
}
.wav-player.is-downloading .wp-progress::-webkit-slider-thumb {
  background: var(--wp-load);
}
.wav-player.is-downloading .wp-progress::-moz-range-thumb {
  background: var(--wp-load);
}
.wav-player.is-downloading-unknown .wp-progress {
  background-image: linear-gradient(90deg, transparent, var(--wp-load), transparent);
  background-size: 40% 100%;
  background-repeat: no-repeat;
  animation: wp-download-sweep 1.15s linear infinite;
}
@keyframes wp-download-sweep {
  from { background-position: -40% 0; }
  to { background-position: 140% 0; }
}
.wav-player .wp-progress {
  flex: 1;
  min-width: 0;
  height: 6px;
  appearance: none;
  -webkit-appearance: none;
  background: color-mix(in srgb, var(--wp-playbar) 28%, transparent);
  border-radius: 99px;
  outline: none;
  cursor: pointer;
}
.wav-player .wp-progress::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--wp-playbar);
  border: 0;
}
.wav-player .wp-progress::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--wp-playbar);
  border: 0;
}
.wav-player.is-loading .wp-box {
  border-color: color-mix(in srgb, var(--wp-load) 70%, var(--wp-line));
}
@media (max-width: 640px) {
  .wav-player .wp-now {
    grid-template-columns: 1fr;
  }
}
`;

  function ensureCss() {
    if (document.getElementById('wav-player-css')) return;
    const style = document.createElement('style');
    style.id = 'wav-player-css';
    style.textContent = PLAYER_CSS;
    document.head.appendChild(style);
  }

  function resolveElement(target) {
    if (!target) throw new Error('WavPlayer requires a target element or id');
    if (target instanceof Element) return target;
    const selector = String(target);
    const byId = document.getElementById(selector.replace(/^#/, ''));
    if (byId) return byId;
    const found = document.querySelector(selector);
    if (!found) throw new Error(`WavPlayer target not found: ${target}`);
    return found;
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
    // Always prefer the CORS-enabled content host. Never fetch www.dropbox.com
    // from the page — that host has no Access-Control-Allow-Origin header.
    value = value.replace(
      /^https?:\/\/(?:www\.)?dropbox\.com\//i,
      'https://dl.dropboxusercontent.com/'
    );
    try {
      const parsed = new URL(value);
      if (parsed.hostname.endsWith('dropboxusercontent.com')) {
        parsed.searchParams.set('dl', '1');
        parsed.searchParams.delete('st');
        return parsed.toString();
      }
      if (parsed.hostname === 'dropbox.com' || parsed.hostname.endsWith('.dropbox.com')) {
        parsed.hostname = 'dl.dropboxusercontent.com';
        parsed.searchParams.set('dl', '1');
        parsed.searchParams.delete('st');
        return parsed.toString();
      }
      return parsed.toString();
    } catch (_) {
      return value;
    }
  }

  function isDropboxUrl(url) {
    return /dropbox\.com/i.test(String(url || ''));
  }

  function corsHint(err) {
    const message = err && err.message ? String(err.message) : String(err || '');
    const onFile = typeof location !== 'undefined' && location.protocol === 'file:';
    if (onFile || /failed to fetch|cors|networkerror/i.test(message)) {
      return (
        'Dropbox blocked the download (CORS). ' +
        'Open GitWrap over http://localhost (not file://), or use the hosted GitHub Pages URL.'
      );
    }
    return message || 'Playback failed';
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

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function readBodyWithProgress(response, onProgress) {
    const totalHeader = Number(response.headers.get('Content-Length'));
    const total = Number.isFinite(totalHeader) && totalHeader > 0 ? totalHeader : 0;
    if (!response.body || typeof response.body.getReader !== 'function') {
      const buffer = await response.arrayBuffer();
      if (onProgress) onProgress(buffer.byteLength, total || buffer.byteLength);
      return buffer;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      if (onProgress) onProgress(loaded, total);
    }
    const merged = new Uint8Array(loaded);
    let offset = 0;
    chunks.forEach((chunk) => {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    });
    return merged.buffer;
  }

  function mimeFromUrl(url) {
    const path = String(url || '').split('?')[0].toLowerCase();
    if (path.endsWith('.wav')) return 'audio/wav';
    if (path.endsWith('.mp3')) return 'audio/mpeg';
    if (path.endsWith('.ogg')) return 'audio/ogg';
    if (path.endsWith('.m4a') || path.endsWith('.mp4')) return 'audio/mp4';
    if (path.endsWith('.flac')) return 'audio/flac';
    return '';
  }

  class WavPlayer {
    /**
     * @param {object} options See file header for the public API.
     */
    constructor(options = {}) {
      this.target = options.target;
      this.title = String(options.title || '');
      this.artist = String(options.artist || '');
      this.imageUrl = normalizeUrl(options.imageUrl || options.image_url || '');
      this.description = String(options.description || '');
      this.tags = parseTags(options.tags);
      this.audioUrl = normalizeUrl(
        pick(
          options,
          'audioUrl',
          'audio_url',
          'url',
          'wav_url',
          'mp3_url',
          'procSongUrl',
          'proc_song_url',
          'procsong_url'
        )
      );
      this.heading = headingText(options.heading, 'Player');
      this.el = null;
      this.root = null;
      this.audio = null;
      this._hadPlayback = false;
      this._seekDragging = false;
      this._objectUrl = '';
      this._resolvedSource = '';
      this._loadToken = 0;
    }

    /**
     * Look up a player by the element (or id) it was rendered into.
     * @param {string|HTMLElement} target
     * @returns {WavPlayer|null}
     */
    static get(target) {
      try {
        const el = resolveElement(target);
        return instances.get(el) || null;
      } catch (_) {
        return null;
      }
    }

    /**
     * Render the player UI into `options.target`.
     * @returns {WavPlayer}
     */
    initialise() {
      ensureCss();
      this.el = resolveElement(this.target);
      instances.set(this.el, this);
      this.renderShell();
      this.bindAudio();
      this.refreshIdentity();
      this.refreshControls();
      return this;
    }

    renderShell() {
      const wrap = document.createElement('div');
      wrap.className = 'wav-player is-empty';

      if (this.heading) {
        const label = document.createElement('p');
        label.className = 'wp-label';
        label.textContent = this.heading;
        wrap.appendChild(label);
      }

      const box = document.createElement('div');
      box.className = 'wp-box';

      const now = document.createElement('div');
      now.className = 'wp-now';

      const identity = document.createElement('div');
      identity.className = 'wp-identity';
      identity.innerHTML = '<p class="wp-empty">No track loaded.</p>';
      now.appendChild(identity);

      const controls = document.createElement('div');
      controls.className = 'wp-controls-col';

      const btns = document.createElement('div');
      btns.className = 'wp-transport-btns';

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'wp-play';
      playBtn.setAttribute('aria-label', 'Play');
      playBtn.innerHTML =
        '<span class="wp-play-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>' +
        '<span class="wp-clock" aria-hidden="true">0:00</span>';
      playBtn.addEventListener('click', () => {
        this.togglePlay().catch(() => {});
      });

      const stopBtn = document.createElement('button');
      stopBtn.type = 'button';
      stopBtn.className = 'wp-stop secondary';
      stopBtn.setAttribute('aria-label', 'Stop');
      stopBtn.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>';
      stopBtn.addEventListener('click', () => {
        this.stop();
      });

      btns.appendChild(playBtn);
      btns.appendChild(stopBtn);
      controls.appendChild(btns);

      const volume = document.createElement('div');
      volume.className = 'wp-volume';
      const volInput = document.createElement('input');
      volInput.type = 'range';
      volInput.min = '0';
      volInput.max = '1';
      volInput.step = '0.01';
      volInput.value = '1';
      volInput.setAttribute('aria-label', 'Volume');
      volInput.addEventListener('input', () => {
        if (this.audio) this.audio.volume = Number(volInput.value);
      });
      volume.appendChild(volInput);
      controls.appendChild(volume);

      now.appendChild(controls);
      box.appendChild(now);

      const footer = document.createElement('div');
      footer.className = 'wp-footer';

      const progress = document.createElement('input');
      progress.type = 'range';
      progress.className = 'wp-progress';
      progress.min = '0';
      progress.max = '0';
      progress.value = '0';
      progress.step = '0.01';
      progress.setAttribute('aria-label', 'Seek');
      progress.addEventListener('pointerdown', () => {
        this._seekDragging = true;
      });
      progress.addEventListener('pointerup', () => {
        this._seekDragging = false;
        if (this.audio && Number.isFinite(Number(progress.value))) {
          this.audio.currentTime = Number(progress.value);
        }
      });
      progress.addEventListener('change', () => {
        this._seekDragging = false;
        if (this.audio && Number.isFinite(Number(progress.value))) {
          this.audio.currentTime = Number(progress.value);
        }
      });

      const status = document.createElement('p');
      status.className = 'wp-status';

      footer.appendChild(progress);
      footer.appendChild(status);
      box.appendChild(footer);
      wrap.appendChild(box);

      this.root = wrap;
      this.el.replaceChildren(wrap);
      this.ui = {
        wrap,
        identity,
        playBtn,
        stopBtn,
        volInput,
        progress,
        status,
        clock: playBtn.querySelector('.wp-clock'),
      };
    }

    bindAudio() {
      if (this.audio) return;
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.addEventListener('timeupdate', () => this.onTimeUpdate());
      audio.addEventListener('loadedmetadata', () => this.onTimeUpdate());
      audio.addEventListener('ended', () => {
        this.refreshControls();
        this.emitStop();
      });
      audio.addEventListener('play', () => this.refreshControls());
      audio.addEventListener('pause', () => this.refreshControls());
      audio.addEventListener('waiting', () => {
        this.root.classList.add('is-loading');
        this.setStatus('Loading…');
      });
      audio.addEventListener('canplay', () => {
        this.root.classList.remove('is-loading');
        if (this.ui.status && !this.ui.status.classList.contains('is-error')) {
          this.setStatus('');
        }
      });
      audio.addEventListener('error', () => {
        this.root.classList.remove('is-loading');
        this.setStatus('Failed to load audio', true);
        this.refreshControls();
      });
      this.audio = audio;
    }

    applyMeta(meta) {
      if (!meta || typeof meta !== 'object') return;
      if ('title' in meta) this.title = String(meta.title || '');
      if ('artist' in meta) this.artist = String(meta.artist || '');
      if ('description' in meta) this.description = String(meta.description || '');
      if ('tags' in meta) this.tags = parseTags(meta.tags);
      const image = pick(meta, 'imageUrl', 'image_url');
      if (image || 'imageUrl' in meta || 'image_url' in meta) {
        this.imageUrl = normalizeUrl(image);
      }
      const audio = pick(
        meta,
        'audioUrl',
        'audio_url',
        'url',
        'wav_url',
        'mp3_url',
        'procSongUrl',
        'proc_song_url',
        'procsong_url'
      );
      if (audio) this.audioUrl = normalizeUrl(audio);
    }

    refreshIdentity() {
      if (!this.ui) return;
      const identity = this.ui.identity;
      identity.replaceChildren();

      const hasTrack = Boolean(this.audioUrl || this.title || this.artist);
      this.root.classList.toggle('is-empty', !hasTrack);

      if (!hasTrack) {
        const empty = document.createElement('p');
        empty.className = 'wp-empty';
        empty.textContent = 'No track loaded.';
        identity.appendChild(empty);
        return;
      }

      const heading = document.createElement('p');
      heading.className = 'wp-heading';

      if (this.title) {
        const title = document.createElement('span');
        title.className = 'wp-title';
        title.textContent = this.title;
        heading.appendChild(title);
      }
      if (this.title && this.artist) {
        const dot = document.createElement('span');
        dot.className = 'wp-dot';
        dot.textContent = '•';
        heading.appendChild(dot);
        const artist = document.createElement('span');
        artist.className = 'wp-artist';
        artist.textContent = this.artist;
        heading.appendChild(artist);
      } else if (!this.title && this.artist) {
        const artist = document.createElement('span');
        artist.className = 'wp-title';
        artist.textContent = this.artist;
        heading.appendChild(artist);
      }
      identity.appendChild(heading);

      if (!this.title && !this.artist && this.audioUrl) {
        const url = document.createElement('p');
        url.className = 'wp-subtitle is-url';
        url.textContent = this.audioUrl;
        identity.appendChild(url);
      } else if (this.title && !this.artist && this.audioUrl) {
        const url = document.createElement('p');
        url.className = 'wp-subtitle is-url';
        url.textContent = this.audioUrl;
        identity.appendChild(url);
      }

      const description = this.description ? String(this.description).trim() : '';
      if (description) {
        const desc = document.createElement('p');
        desc.className = 'wp-desc';
        desc.textContent = description;
        identity.appendChild(desc);
      }

      const tags = Array.isArray(this.tags) ? this.tags.filter(Boolean) : [];
      if (tags.length) {
        const tagsEl = document.createElement('ul');
        tagsEl.className = 'wp-tags';
        tags.forEach((tag) => {
          const li = document.createElement('li');
          li.textContent = tag;
          tagsEl.appendChild(li);
        });
        identity.appendChild(tagsEl);
      }
    }

    refreshControls() {
      if (!this.ui || !this.audio) return;
      const playing = !this.audio.paused && !this.audio.ended && this.audio.currentTime > 0;
      const hasUrl = Boolean(this.audioUrl);
      this.ui.playBtn.disabled = !hasUrl;
      this.ui.stopBtn.disabled = !hasUrl;
      this.ui.progress.disabled = !hasUrl;
      this.ui.playBtn.classList.toggle('is-playing', playing);
      this.ui.playBtn.setAttribute('aria-label', playing ? 'Playing' : 'Play');
      this.onTimeUpdate();
    }

    onTimeUpdate() {
      if (!this.ui || !this.audio) return;
      const current = this.audio.currentTime || 0;
      const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
      if (this.ui.clock) {
        this.ui.clock.textContent = formatTime(current);
      }
      if (!this._seekDragging) {
        this.ui.progress.max = String(duration || 0);
        this.ui.progress.value = String(current || 0);
      }
    }

    setStatus(message, isError) {
      if (!this.ui) return;
      this.ui.status.textContent = message || '';
      this.ui.status.classList.toggle('is-error', Boolean(isError && message));
    }

    setDownloadProgress(loaded, total) {
      if (!this.root || !this.ui) return;
      this.root.classList.add('is-downloading');
      const known = total > 0;
      this.root.classList.toggle('is-downloading-unknown', !known);
      if (!known && loaded <= 0) {
        this.ui.progress.max = '100';
        this.ui.progress.value = '0';
        this.ui.progress.disabled = true;
        this.setStatus('Downloading…');
        return;
      }
      if (known) {
        const pct = Math.min(100, Math.round((loaded / total) * 100));
        this.setStatus(`Downloading ${pct}% · ${formatBytes(loaded)} / ${formatBytes(total)}`);
        this.ui.progress.max = '100';
        this.ui.progress.value = String(pct);
      } else {
        this.setStatus(`Downloading ${formatBytes(loaded)}…`);
      }
      this.ui.progress.disabled = true;
    }

    clearDownloadProgress() {
      if (!this.root) return;
      this.root.classList.remove('is-downloading', 'is-downloading-unknown');
      if (this.ui && this.ui.progress) {
        this.ui.progress.disabled = !this.audioUrl;
      }
    }

    detail() {
      return {
        title: this.title,
        artist: this.artist,
        imageUrl: this.imageUrl,
        description: this.description,
        tags: this.tags.slice(),
        audioUrl: this.audioUrl,
      };
    }

    emitPlay() {
      if (!this.el) return;
      this.el.dispatchEvent(
        new CustomEvent('wavplayer:play', { bubbles: true, detail: this.detail() })
      );
    }

    emitStop() {
      if (!this.el || !this._hadPlayback) return;
      this.el.dispatchEvent(new CustomEvent('wavplayer:stop', { bubbles: true, detail: this.detail() }));
      this._hadPlayback = false;
    }

    async togglePlay() {
      if (!this.audioUrl) return;
      if (this.audio && !this.audio.paused) {
        this.audio.pause();
        this.refreshControls();
        return;
      }
      await this.play();
    }

    revokeObjectUrl() {
      if (this._objectUrl) {
        URL.revokeObjectURL(this._objectUrl);
        this._objectUrl = '';
      }
    }

    /**
     * Dropbox often serves wav/mp3 with a non-audio Content-Type and
     * X-Content-Type-Options: nosniff, so <audio src="…"> fails. Fetch the
     * bytes (CORS allows *) and play via a blob URL with the right MIME.
     */
    async resolvePlayableSrc(remoteUrl, onProgress, signal) {
      const direct = dropboxDirectUrl(remoteUrl);
      const mime = mimeFromUrl(direct) || 'application/octet-stream';

      if (!isDropboxUrl(remoteUrl) && !isDropboxUrl(direct)) {
        return { src: direct, objectUrl: '' };
      }

      // Must be dl.dropboxusercontent.com (has Access-Control-Allow-Origin: *).
      const response = await fetch(direct, {
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await readBodyWithProgress(response, onProgress);
      const blob = new Blob([buffer], { type: mime });
      const objectUrl = URL.createObjectURL(blob);
      return { src: objectUrl, objectUrl };
    }

    /**
     * Load (optional) metadata / URL and start playback.
     * @param {object} [meta]
     * @returns {Promise}
     */
    async play(meta) {
      if (!this.el) this.initialise();
      if (meta) {
        this.applyMeta(meta);
        this.refreshIdentity();
      }
      if (!this.audioUrl) throw new Error('WavPlayer: no audioUrl provided');

      this.bindAudio();
      const loadToken = (this._loadToken += 1);
      const remote = this.audioUrl;

      this.root.classList.add('is-loading');
      if (isDropboxUrl(remote)) {
        this.setDownloadProgress(0, 0);
      } else {
        this.setStatus('Loading…');
      }
      this.refreshControls();

      if (this._downloadAbort) this._downloadAbort.abort();
      const abort = new AbortController();
      this._downloadAbort = abort;

      try {
        if (this._resolvedSource !== remote) {
          const resolved = await this.resolvePlayableSrc(
            remote,
            (loaded, total) => {
              if (loadToken !== this._loadToken) return;
              this.setDownloadProgress(loaded, total);
            },
            abort.signal
          );
          if (loadToken !== this._loadToken) {
            if (resolved.objectUrl) URL.revokeObjectURL(resolved.objectUrl);
            return;
          }
          this.revokeObjectUrl();
          this._objectUrl = resolved.objectUrl;
          this._resolvedSource = remote;
          while (this.audio.firstChild) this.audio.removeChild(this.audio.firstChild);
          this.audio.src = resolved.src;
          this.audio.load();
        }

        this.clearDownloadProgress();
        await this.audio.play();
        if (loadToken !== this._loadToken) return;
        this._hadPlayback = true;
        this.root.classList.remove('is-loading');
        this.setStatus('');
        this.refreshControls();
        this.emitPlay();
      } catch (err) {
        if (loadToken !== this._loadToken || (err && err.name === 'AbortError')) return;
        this.root.classList.remove('is-loading');
        this.clearDownloadProgress();
        this.setStatus(corsHint(err), true);
        this.refreshControls();
        throw err;
      }
    }

    /**
     * Stop playback and reset to the start of the current track.
     */
    stop() {
      if (!this.audio) return;
      this.audio.pause();
      try {
        this.audio.currentTime = 0;
      } catch (_) {
        /* ignore */
      }
      this.refreshControls();
      this.emitStop();
    }
  }

  global.WavPlayer = WavPlayer;
})(typeof window !== 'undefined' ? window : this);
