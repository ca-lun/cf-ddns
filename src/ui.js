/**
 * Web 管理界面
 */

export function getHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DDNS 管理面板</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-card: #334155;
      --text-primary: #f1f5f9;
      --text-secondary: #94a3b8;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
      --border: #475569;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    
    h1 {
      font-size: 1.75rem;
      background: linear-gradient(135deg, var(--accent), #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .btn {
      padding: 0.625rem 1.25rem;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .btn-primary {
      background: var(--accent);
      color: white;
    }
    
    .btn-primary:hover { background: var(--accent-hover); }
    
    .btn-success {
      background: var(--success);
      color: white;
    }
    
    .btn-danger {
      background: var(--danger);
      color: white;
    }
    
    .btn-secondary {
      background: var(--bg-card);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .card {
      background: var(--bg-secondary);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid var(--border);
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .card-title {
      font-size: 1.125rem;
      font-weight: 600;
    }
    
    .config-list {
      display: grid;
      gap: 1rem;
    }
    
    .config-item {
      background: var(--bg-card);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .config-info h3 {
      font-size: 1rem;
      margin-bottom: 0.25rem;
      color: var(--accent);
    }
    
    .config-info .zone {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }
    
    .targets {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
    
    .tag {
      background: var(--bg-secondary);
      padding: 0.25rem 0.625rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    
    .config-actions {
      display: flex;
      gap: 0.5rem;
    }
    
    .btn-icon {
      width: 2rem;
      height: 2rem;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.375rem;
      font-size: 1rem;
    }
    
    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s;
    }
    
    .modal-overlay.active {
      opacity: 1;
      visibility: visible;
    }
    
    .modal {
      background: var(--bg-secondary);
      border-radius: 1rem;
      padding: 1.5rem;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      border: 1px solid var(--border);
    }
    
    .modal h2 {
      margin-bottom: 1.5rem;
      font-size: 1.25rem;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    
    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 0.625rem;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      background: var(--bg-card);
      color: var(--text-primary);
      font-size: 0.875rem;
    }
    
    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--accent);
    }
    
    .form-group textarea {
      min-height: 80px;
      resize: vertical;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    
    .form-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }
    
    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .checkbox-group input {
      width: auto;
    }
    
    /* Logs */
    .logs-list {
      max-height: 400px;
      overflow-y: auto;
    }
    
    .log-item {
      padding: 0.75rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.875rem;
    }
    
    .log-item:last-child {
      border-bottom: none;
    }
    
    .log-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    
    .log-time {
      color: var(--text-secondary);
    }
    
    .log-duration {
      color: var(--text-secondary);
    }
    
    .log-results {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    
    .log-result {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
    
    .log-result.success { background: rgba(34, 197, 94, 0.2); color: var(--success); }
    .log-result.unchanged { background: rgba(148, 163, 184, 0.2); color: var(--text-secondary); }
    .log-result.error { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
    .log-result.warning { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
    
    .empty {
      text-align: center;
      color: var(--text-secondary);
      padding: 2rem;
    }
    
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .status-badge.syncing {
      background: rgba(59, 130, 246, 0.2);
      color: var(--accent);
    }
    
    @media (max-width: 640px) {
      .container { padding: 1rem; }
      .form-row { grid-template-columns: 1fr; }
      header { flex-direction: column; gap: 1rem; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🌐 DDNS 管理面板</h1>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-success" onclick="syncNow()" id="syncBtn">
          ⚡ 立即同步
        </button>
        <button class="btn btn-primary" onclick="openModal()">
          ➕ 添加配置
        </button>
      </div>
    </header>
    
    <div class="card">
      <div class="card-header">
        <span class="card-title">📋 域名配置</span>
        <span id="configCount" class="tag">0 个配置</span>
      </div>
      <div class="config-list" id="configList">
        <div class="empty">加载中...</div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-header">
        <span class="card-title">📜 同步日志</span>
        <button class="btn btn-secondary" onclick="loadLogs()">🔄 刷新</button>
      </div>
      <div class="logs-list" id="logsList">
        <div class="empty">加载中...</div>
      </div>
    </div>
  </div>
  
  <!-- Modal -->
  <div class="modal-overlay" id="modalOverlay" onclick="closeModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
      <h2 id="modalTitle">添加配置</h2>
      <form id="configForm" onsubmit="saveConfig(event)">
        <input type="hidden" id="configId">
        
        <div class="form-group">
          <label>DNS 记录名 *</label>
          <input type="text" id="recordName" placeholder="app.example.com" required>
          <small style="color: var(--text-secondary); font-size: 0.75rem;">Zone 将自动识别</small>
        </div>
        
        <div class="form-group">
          <label>目标域名（每行一个）*</label>
          <textarea id="targets" placeholder="server1.backend.com&#10;server2.backend.com" required></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>TTL（秒）</label>
            <input type="number" id="ttl" value="60" min="1">
          </div>
          <div class="form-group">
            <label>&nbsp;</label>
            <div class="checkbox-group">
              <input type="checkbox" id="proxied">
              <label for="proxied" style="margin: 0;">启用 Cloudflare 代理</label>
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
          <button type="submit" class="btn btn-primary">保存</button>
        </div>
      </form>
    </div>
  </div>
  
  <script>
    // Load configs on page load
    document.addEventListener('DOMContentLoaded', () => {
      loadConfigs();
      loadLogs();
    });
    
    async function loadConfigs() {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        renderConfigs(data.data || []);
      } catch (e) {
        document.getElementById('configList').innerHTML = '<div class="empty">加载失败</div>';
      }
    }
    
    function renderConfigs(configs) {
      const container = document.getElementById('configList');
      document.getElementById('configCount').textContent = configs.length + ' 个配置';
      
      if (configs.length === 0) {
        container.innerHTML = '<div class="empty">暂无配置，点击右上角添加</div>';
        return;
      }
      
      container.innerHTML = configs.map(c => \`
        <div class="config-item">
          <div class="config-info">
            <h3>\${c.record_name}</h3>
            <div class="zone">Zone: \${c.zone_name || '自动识别'} · TTL: \${c.ttl || 60}s \${c.proxied ? '· 🟠 代理' : ''}</div>
            <div class="targets">
              \${c.targets.map(t => \`<span class="tag">\${t}</span>\`).join('')}
            </div>
          </div>
          <div class="config-actions">
            <button class="btn btn-secondary btn-icon" onclick='editConfig(\${JSON.stringify(c)})'>✏️</button>
            <button class="btn btn-danger btn-icon" onclick="deleteConfig('\${c.id}')">🗑️</button>
          </div>
        </div>
      \`).join('');
    }
    
    async function loadLogs() {
      try {
        const res = await fetch('/api/logs?limit=20');
        const data = await res.json();
        renderLogs(data.data || []);
      } catch (e) {
        document.getElementById('logsList').innerHTML = '<div class="empty">加载失败</div>';
      }
    }
    
    function renderLogs(logs) {
      const container = document.getElementById('logsList');
      
      if (logs.length === 0) {
        container.innerHTML = '<div class="empty">暂无同步日志</div>';
        return;
      }
      
      container.innerHTML = logs.map(log => \`
        <div class="log-item">
          <div class="log-header">
            <span class="log-time">\${new Date(log.timestamp).toLocaleString('zh-CN')}</span>
            <span class="log-duration">\${log.duration}ms</span>
          </div>
          <div class="log-results">
            \${log.results.map(r => \`
              <span class="log-result \${r.status}">\${r.record_name}: \${getStatusText(r)}</span>
            \`).join('')}
          </div>
        </div>
      \`).join('');
    }
    
    function getStatusText(r) {
      if (r.status === 'success') return \`+\${r.changes.added.length} -\${r.changes.deleted.length}\`;
      if (r.status === 'unchanged') return '无变化';
      if (r.status === 'error') return r.error || '错误';
      if (r.status === 'warning') return r.error || '警告';
      return r.status;
    }
    
    function openModal(config = null) {
      document.getElementById('modalOverlay').classList.add('active');
      document.getElementById('modalTitle').textContent = config ? '编辑配置' : '添加配置';
      
      if (config) {
        document.getElementById('configId').value = config.id;
        document.getElementById('recordName').value = config.record_name;
        document.getElementById('targets').value = config.targets.join('\\n');
        document.getElementById('ttl').value = config.ttl || 60;
        document.getElementById('proxied').checked = config.proxied || false;
      } else {
        document.getElementById('configForm').reset();
        document.getElementById('configId').value = '';
        document.getElementById('ttl').value = 60;
      }
    }
    
    function closeModal(e) {
      if (!e || e.target === e.currentTarget) {
        document.getElementById('modalOverlay').classList.remove('active');
      }
    }
    
    function editConfig(config) {
      openModal(config);
    }
    
    async function saveConfig(e) {
      e.preventDefault();
      
      const config = {
        id: document.getElementById('configId').value || undefined,
        record_name: document.getElementById('recordName').value.trim(),
        targets: document.getElementById('targets').value.trim().split('\\n').map(s => s.trim()).filter(s => s),
        ttl: parseInt(document.getElementById('ttl').value) || 60,
        proxied: document.getElementById('proxied').checked
      };
      
      try {
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        closeModal();
        loadConfigs();
      } catch (e) {
        alert('保存失败: ' + e.message);
      }
    }
    
    async function deleteConfig(id) {
      if (!confirm('确定要删除这个配置吗？')) return;
      
      try {
        await fetch('/api/config/' + id, { method: 'DELETE' });
        loadConfigs();
      } catch (e) {
        alert('删除失败: ' + e.message);
      }
    }
    
    async function syncNow() {
      const btn = document.getElementById('syncBtn');
      btn.disabled = true;
      btn.innerHTML = '⏳ 同步中...';
      
      try {
        const res = await fetch('/api/sync', { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
          alert('同步完成！耗时 ' + data.data.duration + 'ms');
          loadLogs();
        } else {
          alert('同步失败: ' + (data.error || '未知错误'));
        }
      } catch (e) {
        alert('同步失败: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '⚡ 立即同步';
      }
    }
  </script>
</body>
</html>`;
}
