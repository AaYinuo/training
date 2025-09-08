// ===== 应用初始化 =====
const STORAGE_KEY = 'fitTrackDataV2';
let data = null;
let provider = null;

// Nutstore Provider 抽象
class StorageProvider {
  async init() {}
  async loadData() { return {}; }
  async saveData(_) {}
}

// Nutstore 实现
class NutstoreProvider extends StorageProvider {
  constructor({ workerUrl, token, remotePath }) {
    super();
    this.workerUrl = workerUrl;
    this.token = token;
    this.remotePath = remotePath;
  }
  async init() {
    const res = await fetch(`${this.workerUrl}/${this.remotePath}`, {
      method: 'OPTIONS',
      headers: { 'X-Auth': this.token }
    });
    if (!res.ok) throw new Error(`连通失败：${res.status}`);
  }
  async loadData() {
    const res = await fetch(`${this.workerUrl}/${this.remotePath}`, {
      headers: { 'X-Auth': this.token }
    });
    if (!res.ok) throw new Error(`下载失败：${res.status}`);
    return res.json();
  }
  async saveData(obj) {
    const res = await fetch(`${this.workerUrl}/${this.remotePath}`, {
      method: 'PUT',
      headers: {
        'X-Auth': this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(obj)
    });
    if (!res.ok) throw new Error(`上传失败：${res.status}`);
  }
}

// 默认配置模板
const defaultCfg = {
  channel: 'nutstore',
  nutstore: {
    workerUrl: '',
    token: '',
    remotePath: 'Training/fittrack.json'
  }
};

// 读取/保存配置
function loadCfg() {
  try { return JSON.parse(localStorage.getItem('syncCfg')); }
  catch { return null; }
}
function saveCfg(cfg) {
  localStorage.setItem('syncCfg', JSON.stringify(cfg));
}

// 数据模型操作
function loadLocalData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
  catch { return null; }
}
function saveLocalData(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

// 应用启动流程
async function bootstrap() {
  // 1. 读取本地 config
  const cfg = loadCfg() || defaultCfg;
  // 2. 根据 channel 实例化 provider
  if (cfg.channel === 'nutstore') {
    provider = new NutstoreProvider(cfg.nutstore);
  }
  // 3. 测试连通 & 拉取远端
  try {
    await provider.init();
    const remote = await provider.loadData();
    data = remote;
  } catch {
    data = loadLocalData() || {};
  }
  // 4. 渲染 UI
  saveLocalData(data);
  renderAll();
}

// 保存数据并同步
async function saveAndSync() {
  saveLocalData(data);
  renderAll();
  try {
    await provider.saveData(data);
    showToast('已同步到坚果云');
  } catch (e) {
    showToast('同步失败：' + e.message);
  }
}

// PWA Service Worker 注册
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

// ========= 以下为你之前的全部功能代码 =========
// （包括主题切换、Tab 切换、Dashboard、Training、Wellness、Nutrition、Review、Settings 保存等）
// 但所有写入 localStorage 的地方，都改为调用 saveAndSync()
// 比如在保存表单时，原来是 saveAll()，现在改为：
//
// form.addEventListener('submit', async e => {
//   e.preventDefault();
//   // ... 更新 data ...
//   await saveAndSync();
// });
//
// ===========================================

// 在“设置 → 存储设置”添加 UI 控件
function initStorageSettingsUI() {
  const container = document.getElementById('storageSettings');
  container.innerHTML = `
    <label>存储信道
      <select id="channelSelect">
        <option value="nutstore">坚果云 (Nutstore)</option>
      </select>
    </label>
    <div id="nutstoreCfg">
      <label>Worker 地址 <input type="url" id="nutWorker" placeholder="https://...workers.dev" /></label>
      <label>令牌 <input type="text" id="nutToken" /></label>
      <label>远端路径 <input type="text" id="nutPath" /></label>
      <button id="testConn" class="btn-outline">测试连通</button>
      <button id="saveConn" class="btn-primary">保存设置</button>
    </div>
  `;
  // 读取填充
  const cfg = loadCfg() || defaultCfg;
  document.getElementById('nutWorker').value = cfg.nutstore.workerUrl;
  document.getElementById('nutToken').value = cfg.nutstore.token;
  document.getElementById('nutPath').value = cfg.nutstore.remotePath;

  document.getElementById('testConn').addEventListener('click', async () => {
    const w = document.getElementById('nutWorker').value;
    const t = document.getElementById('nutToken').value;
    const p = document.getElementById('nutPath').value;
    const prov = new NutstoreProvider({ workerUrl: w, token: t, remotePath: p });
    try { await prov.init(); alert('连通成功'); }
    catch (e) { alert('连通失败：'+e.message); }
  });

  document.getElementById('saveConn').addEventListener('click', () => {
    const w = document.getElementById('nutWorker').value;
    const t = document.getElementById('nutToken').value;
    const p = document.getElementById('nutPath').value;
    const newCfg = { channel:'nutstore', nutstore:{workerUrl:w,token:t,remotePath:p} };
    saveCfg(newCfg);
    alert('设置已保存，重载页面以生效');
  });
}

// 页面渲染各阶段调用
window.addEventListener('load', async () => {
  initStorageSettingsUI();
  await bootstrap();
});
