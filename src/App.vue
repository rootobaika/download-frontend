<script setup>
import { onMounted, reactive, ref } from 'vue';

const RELEASES_URL = 'https://github.com/rootobaika/ObaikaTracking/releases';
const ASSET_BASE_URL = 'https://github.com';
const GITHUB_LATEST_RELEASE_API = 'https://api.github.com/repos/rootobaika/ObaikaTracking/releases/latest';

const downloads = ref([
  { id: 'windows-msi', os: 'Windows', note: 'x64 Installer (.msi)', href: 'https://github.com/rootobaika/ObaikaTracking/releases/download/v0.1.2/Obaika.Tracker_0.1.2_x64_en-US.msi', cta: 'Скачать для Windows', size: '2.73 MB' },
  { id: 'macos-dmg', os: 'macOS', note: 'Universal (.dmg)', href: RELEASES_URL, cta: 'Скачать для macOS', size: '3.15 MB' },
  { id: 'linux-deb', os: 'Linux', note: '.deb', href: RELEASES_URL, cta: 'Скачать для Linux', size: 'Смотри в релизе' },
  { id: 'linux-appimage', os: 'Linux', note: 'AppImage', href: 'https://github.com/rootobaika/ObaikaTracking/releases/download/v0.1.2/Obaika.Tracker_0.1.2_amd64.AppImage', cta: 'Скачать для Linux', size: '76.8 MB' },
  { id: 'android-apk', os: 'Android', note: 'APK (.apk)', href: RELEASES_URL, cta: 'Скачать для Android', size: 'Смотри в релизе' },
]);

const releaseAssets = ref([
  { name: 'app-universal-release-unsigned.apk', href: '/rootobaika/ObaikaTracking/releases/download/v0.1.2/app-universal-release-unsigned.apk' },
  { name: 'Obaika.Tracker-0.1.2-1.x86_64.rpm', href: '/rootobaika/ObaikaTracking/releases/download/v0.1.2/Obaika.Tracker-0.1.2-1.x86_64.rpm' },
  { name: 'Obaika.Tracker_0.1.2_aarch64.dmg', href: '/rootobaika/ObaikaTracking/releases/download/v0.1.2/Obaika.Tracker_0.1.2_aarch64.dmg' },
  { name: 'Obaika.Tracker_0.1.2_amd64.AppImage', href: '/rootobaika/ObaikaTracking/releases/download/v0.1.2/Obaika.Tracker_0.1.2_amd64.AppImage' },
  { name: 'Obaika.Tracker_0.1.2_amd64.deb', href: '/rootobaika/ObaikaTracking/releases/download/v0.1.2/Obaika.Tracker_0.1.2_amd64.deb' },
  { name: 'Obaika.Tracker_0.1.2_x64-setup.exe', href: '/rootobaika/ObaikaTracking/releases/download/v0.1.2/Obaika.Tracker_0.1.2_x64-setup.exe' },
  { name: 'Obaika.Tracker_0.1.2_x64_en-US.msi', href: '/rootobaika/ObaikaTracking/releases/download/v0.1.2/Obaika.Tracker_0.1.2_x64_en-US.msi' },
  { name: 'Source code (zip)', href: '/rootobaika/ObaikaTracking/archive/refs/tags/v0.1.2.zip' },
  { name: 'Source code (tar.gz)', href: '/rootobaika/ObaikaTracking/archive/refs/tags/v0.1.2.tar.gz' },
]);
const latestVersionLabel = ref('0.1.3');

const loadingByOs = reactive({});
const progressByOs = reactive({});
const doneByOs = reactive({});

function toMbLabel(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Смотри в релизе';
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function updateDownload(id, asset) {
  if (!asset?.browser_download_url) return;
  const item = downloads.value.find((entry) => entry.id === id);
  if (!item) return;
  item.href = asset.browser_download_url;
  item.size = toMbLabel(asset.size);
}

function getAsset(assets, matcher) {
  return assets.find((asset) => typeof asset?.name === 'string' && matcher(asset.name));
}

async function hydrateDownloadsFromGithub() {
  try {
    const response = await fetch(GITHUB_LATEST_RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) return;

    const release = await response.json();
    const assets = Array.isArray(release.assets) ? release.assets : [];

    if (release.tag_name) {
      latestVersionLabel.value = String(release.tag_name).replace(/^v/i, '');
    }

    const msi = getAsset(assets, (name) => name.toLowerCase().endsWith('.msi'));
    const dmg = getAsset(assets, (name) => name.toLowerCase().endsWith('.dmg'));
    const deb = getAsset(assets, (name) => name.endsWith('_amd64.deb'));
    const appImage = getAsset(assets, (name) => name.toLowerCase().endsWith('.appimage'));
    const signedApk = getAsset(assets, (name) => name.endsWith('-signed.apk'));
    const unsignedApk = getAsset(assets, (name) => name.toLowerCase().endsWith('.apk'));
    const apk = signedApk || unsignedApk;

    updateDownload('windows-msi', msi);
    updateDownload('macos-dmg', dmg);
    updateDownload('linux-deb', deb);
    updateDownload('linux-appimage', appImage);
    updateDownload('android-apk', apk);

    const assetLinks = assets.map((asset) => ({
      name: asset.name,
      href: String(asset.browser_download_url || '').replace('https://github.com', ''),
    }));

    const tag = String(release.tag_name || '').trim();
    if (tag) {
      assetLinks.push({ name: 'Source code (zip)', href: `/rootobaika/ObaikaTracking/archive/refs/tags/${tag}.zip` });
      assetLinks.push({ name: 'Source code (tar.gz)', href: `/rootobaika/ObaikaTracking/archive/refs/tags/${tag}.tar.gz` });
    }

    if (assetLinks.length) {
      releaseAssets.value = assetLinks;
    }
  } catch (_err) {
    // Keep fallback links if GitHub API is unavailable.
  }
}

function handleDownload(item) {
  if (loadingByOs[item.id]) return;
  loadingByOs[item.id] = true;
  doneByOs[item.id] = false;
  progressByOs[item.id] = 0;

  const intervalId = setInterval(() => {
    const nextValue = Math.min(100, (progressByOs[item.id] || 0) + 6 + Math.floor(Math.random() * 12));
    progressByOs[item.id] = nextValue;

    if (nextValue >= 100) {
      clearInterval(intervalId);
      loadingByOs[item.id] = false;
      doneByOs[item.id] = true;

      if (item.href && item.href !== '#') {
        window.open(item.href, '_blank', 'noopener,noreferrer');
      }
    }
  }, 130);
}

onMounted(() => {
  hydrateDownloadsFromGithub();
});
</script>

<template>
  <main class="page">
    <div class="aurora" aria-hidden="true">
      <span class="glow g1"></span>
      <span class="glow g2"></span>
      <span class="glow g3"></span>
      <span class="mesh"></span>
    </div>

    <section class="hero reveal">
      <p class="chip">Obaika Tracker • Desktop + Android</p>
      <h1>Скачай приложение, которое выглядит так же хорошо, как работает</h1>
      <p class="lead">
        Отдельный frontend для скачивания: выразительный лендинг, плавные анимации и быстрый доступ к сборкам для всех платформ.
      </p>

      <div class="cta-row">
        <a class="btn btn-main" href="#downloads">Скачать сейчас</a>
        <a class="btn btn-ghost" href="#features">Что внутри</a>
        <a class="btn btn-ghost" :href="RELEASES_URL" target="_blank" rel="noopener noreferrer">
          Другие системы
        </a>
      </div>

      <ul class="meta">
        <li>Работает офлайн</li>
        <li>Локальное хранение</li>
        <li>Быстрый старт</li>
      </ul>
    </section>

    <section id="features" class="features">
      <article class="feature reveal delay-1">
        <h2>Мягкая анимация</h2>
        <p>Аккуратные переходы и появление блоков создают ощущение живого продукта.</p>
      </article>
      <article class="feature reveal delay-2">
        <h2>Чистый визуал</h2>
        <p>Контрастная палитра, выразительная типографика и читаемый layout на любом экране.</p>
      </article>
      <article class="feature reveal delay-3">
        <h2>Быстрый доступ</h2>
        <p>Четыре платформы, понятные кнопки, версия и размер файла прямо в карточке.</p>
      </article>
    </section>

    <section id="downloads" class="downloads reveal delay-2">
      <header>
        <h2>Выбери платформу</h2>
        <p>Свежая версия {{ latestVersionLabel }}</p>
      </header>

      <div class="grid">
        <article v-for="(item, i) in downloads" :key="item.id" class="card reveal" :style="{ '--delay': `${220 + i * 120}ms` }">
          <p class="os">{{ item.os }}</p>
          <p class="note">{{ item.note }}</p>
          <p class="size">Размер: {{ item.size }}</p>
          <button
            type="button"
            class="download-btn"
            :class="{ loading: loadingByOs[item.id], done: doneByOs[item.id] }"
            :disabled="loadingByOs[item.id]"
            @click="handleDownload(item)"
          >
            <span v-if="loadingByOs[item.id]">Скачивание... {{ progressByOs[item.id] || 0 }}%</span>
            <span v-else-if="doneByOs[item.id]">Готово</span>
            <span v-else>{{ item.cta }}</span>
          </button>

          <div class="download-progress" :class="{ active: loadingByOs[item.id] }" aria-hidden="true">
            <span :style="{ width: `${progressByOs[item.id] || 0}%` }"></span>
          </div>
        </article>
      </div>
    </section>

    <section class="downloads reveal delay-3">
      <header>
        <h2>Все файлы релиза</h2>
        <p>Добавлено из assets.txt</p>
      </header>

      <div class="assets-grid">
        <article v-for="asset in releaseAssets" :key="asset.name" class="asset-item">
          <p class="asset-name">{{ asset.name }}</p>
          <a :href="`${ASSET_BASE_URL}${asset.href}`" target="_blank" rel="noopener noreferrer">Скачать</a>
        </article>
      </div>
    </section>
  </main>
</template>
