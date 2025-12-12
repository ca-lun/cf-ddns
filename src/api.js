/**
 * 配置管理 API
 */

const CONFIG_KEY = 'domain_configs';
const LOGS_KEY = 'sync_logs';
const MAX_LOGS = 50;

/**
 * 获取所有域名配置
 */
export async function getConfigs(kv) {
    try {
        const data = await kv.get(CONFIG_KEY, 'json');
        return data || [];
    } catch {
        return [];
    }
}

/**
 * 保存域名配置
 */
export async function saveConfigs(kv, configs) {
    await kv.put(CONFIG_KEY, JSON.stringify(configs));
}

/**
 * 添加或更新配置
 */
export async function upsertConfig(kv, config) {
    const configs = await getConfigs(kv);

    // 生成 ID（如果没有）
    if (!config.id) {
        config.id = `cfg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 查找是否存在
    const index = configs.findIndex(c => c.id === config.id);
    if (index >= 0) {
        configs[index] = config;
    } else {
        configs.push(config);
    }

    await saveConfigs(kv, configs);
    return config;
}

/**
 * 删除配置
 */
export async function deleteConfig(kv, id) {
    const configs = await getConfigs(kv);
    const newConfigs = configs.filter(c => c.id !== id);
    await saveConfigs(kv, newConfigs);
    return newConfigs.length < configs.length;
}

/**
 * 保存同步日志
 */
export async function saveSyncLog(kv, log) {
    try {
        let logs = await kv.get(LOGS_KEY, 'json') || [];
        logs.unshift(log);

        // 只保留最近 N 条
        if (logs.length > MAX_LOGS) {
            logs = logs.slice(0, MAX_LOGS);
        }

        await kv.put(LOGS_KEY, JSON.stringify(logs));
    } catch (error) {
        console.error('保存日志失败:', error);
    }
}

/**
 * 获取同步日志
 */
export async function getSyncLogs(kv, limit = 20) {
    try {
        const logs = await kv.get(LOGS_KEY, 'json') || [];
        return logs.slice(0, limit);
    } catch {
        return [];
    }
}

/**
 * 处理 API 请求
 */
export async function handleApiRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS
    if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const jsonResponse = (data, status = 200) => {
        return new Response(JSON.stringify(data), {
            status,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    };

    try {
        // GET /api/config - 获取配置列表
        if (path === '/api/config' && method === 'GET') {
            const configs = await getConfigs(env.DDNS_CONFIG);
            return jsonResponse({ success: true, data: configs });
        }

        // POST /api/config - 添加/更新配置
        if (path === '/api/config' && method === 'POST') {
            const body = await request.json();
            const config = await upsertConfig(env.DDNS_CONFIG, body);
            return jsonResponse({ success: true, data: config });
        }

        // DELETE /api/config/:id - 删除配置
        if (path.startsWith('/api/config/') && method === 'DELETE') {
            const id = path.split('/').pop();
            const deleted = await deleteConfig(env.DDNS_CONFIG, id);
            return jsonResponse({ success: deleted });
        }

        // POST /api/sync - 手动触发同步
        if (path === '/api/sync' && method === 'POST') {
            const { syncAll } = await import('./ddns.js');
            const configs = await getConfigs(env.DDNS_CONFIG);

            if (configs.length === 0) {
                return jsonResponse({ success: false, error: '没有配置任何域名' }, 400);
            }

            const result = await syncAll(configs, env.CF_API_TOKEN);
            await saveSyncLog(env.DDNS_CONFIG, result);
            return jsonResponse({ success: true, data: result });
        }

        // GET /api/logs - 获取同步日志
        if (path === '/api/logs' && method === 'GET') {
            const limit = parseInt(url.searchParams.get('limit') || '20');
            const logs = await getSyncLogs(env.DDNS_CONFIG, limit);
            return jsonResponse({ success: true, data: logs });
        }

        return jsonResponse({ error: 'Not Found' }, 404);

    } catch (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
    }
}
