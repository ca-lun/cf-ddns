/**
 * Cloudflare Worker DDNS 入口
 */

import { handleApiRequest, getConfigs, saveSyncLog } from './api.js';
import { syncAll } from './ddns.js';
import { getHtml } from './ui.js';

export default {
    /**
     * HTTP 请求处理
     */
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // API 请求
        if (url.pathname.startsWith('/api/')) {
            return handleApiRequest(request, env);
        }

        // 主页 - Web 管理界面
        return new Response(getHtml(), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    },

    /**
     * 定时任务处理 (Cron)
     */
    async scheduled(event, env, ctx) {
        console.log('DDNS 定时任务开始执行...');

        try {
            // 获取配置
            const configs = await getConfigs(env.DDNS_CONFIG);

            if (configs.length === 0) {
                console.log('没有配置任何域名，跳过同步');
                return;
            }

            // 执行同步
            const result = await syncAll(configs, env.CF_API_TOKEN);

            // 保存日志
            await saveSyncLog(env.DDNS_CONFIG, result);

            // 输出结果
            for (const r of result.results) {
                if (r.status === 'success') {
                    console.log(`[${r.record_name}] 同步成功: +${r.changes.added.length} -${r.changes.deleted.length}`);
                } else if (r.status === 'unchanged') {
                    console.log(`[${r.record_name}] 无变化`);
                } else {
                    console.log(`[${r.record_name}] ${r.status}: ${r.error || ''}`);
                }
            }

            console.log(`DDNS 同步完成，耗时 ${result.duration}ms`);

        } catch (error) {
            console.error('DDNS 同步失败:', error);
        }
    }
};
