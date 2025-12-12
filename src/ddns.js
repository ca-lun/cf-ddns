/**
 * DDNS 核心逻辑
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const DOH_URL = 'https://cloudflare-dns.com/dns-query';

/**
 * 从 record_name 提取 zone_name
 * 例如: app.example.com -> example.com
 *       sub.app.example.co.uk -> example.co.uk (尝试多种可能)
 */
export function extractZoneName(recordName) {
  const parts = recordName.split('.');
  // 尝试从最短的可能域名开始 (最后两段)
  // 返回所有可能的 zone name，从短到长
  const possibilities = [];
  for (let i = parts.length - 2; i >= 0; i--) {
    possibilities.push(parts.slice(i).join('.'));
  }
  return possibilities;
}

/**
 * 智能获取 Zone ID，自动尝试多种可能的 zone name
 */
export async function findZoneId(recordName, apiToken) {
  const possibilities = extractZoneName(recordName);

  for (const zoneName of possibilities) {
    const zoneId = await getZoneId(zoneName, apiToken);
    if (zoneId) {
      return { zoneId, zoneName };
    }
  }

  return { zoneId: null, zoneName: null };
}

/**
 * 使用 DNS over HTTPS 解析域名的 A 记录
 * @param {string} domain - 要解析的域名
 * @returns {Promise<string[]>} - IP 地址列表
 */
export async function resolveTargetIPs(domain) {
  try {
    const url = `${DOH_URL}?name=${encodeURIComponent(domain)}&type=A`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/dns-json'
      }
    });

    if (!response.ok) {
      throw new Error(`DoH request failed: ${response.status}`);
    }

    const data = await response.json();
    const ips = [];

    if (data.Answer) {
      for (const answer of data.Answer) {
        // Type 1 = A record
        if (answer.type === 1) {
          ips.push(answer.data);
        }
      }
    }

    return ips;
  } catch (error) {
    console.error(`解析 ${domain} 失败:`, error.message);
    return [];
  }
}

/**
 * 解析多个目标域名的所有 IP
 * @param {string[]} targets - 目标域名列表
 * @returns {Promise<{ips: string[], details: object[]}>}
 */
export async function resolveAllTargets(targets) {
  const allIps = new Set();
  const details = [];

  for (const domain of targets) {
    const ips = await resolveTargetIPs(domain);
    details.push({ domain, ips });
    ips.forEach(ip => allIps.add(ip));
  }

  return { ips: Array.from(allIps), details };
}

/**
 * 获取 Zone ID
 * @param {string} zoneName - Zone 名称
 * @param {string} apiToken - Cloudflare API Token
 * @returns {Promise<string|null>}
 */
export async function getZoneId(zoneName, apiToken) {
  try {
    const url = `${CF_API_BASE}/zones?name=${encodeURIComponent(zoneName)}&status=active`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success && data.result && data.result.length > 0) {
      return data.result[0].id;
    }

    console.error(`未找到 Zone: ${zoneName}`);
    return null;
  } catch (error) {
    console.error(`获取 Zone ID 失败:`, error.message);
    return null;
  }
}

/**
 * 获取当前的 DNS A 记录
 * @param {string} zoneId - Zone ID
 * @param {string} recordName - 记录名称
 * @param {string} apiToken - API Token
 * @returns {Promise<object[]>}
 */
export async function getCurrentRecords(zoneId, recordName, apiToken) {
  try {
    const url = `${CF_API_BASE}/zones/${zoneId}/dns_records?name=${encodeURIComponent(recordName)}&type=A&per_page=100`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return data.success ? data.result : [];
  } catch (error) {
    console.error(`获取 DNS 记录失败:`, error.message);
    return [];
  }
}

/**
 * 添加 DNS 记录
 */
export async function addRecord(zoneId, name, ip, proxied, ttl, apiToken) {
  try {
    const url = `${CF_API_BASE}/zones/${zoneId}/dns_records`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'A',
        name: name,
        content: ip,
        ttl: ttl,
        proxied: proxied
      })
    });

    const data = await response.json();
    return { success: data.success, ip, action: 'add' };
  } catch (error) {
    return { success: false, ip, action: 'add', error: error.message };
  }
}

/**
 * 删除 DNS 记录
 */
export async function deleteRecord(zoneId, recordId, ip, apiToken) {
  try {
    const url = `${CF_API_BASE}/zones/${zoneId}/dns_records/${recordId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return { success: data.success, ip, action: 'delete' };
  } catch (error) {
    return { success: false, ip, action: 'delete', error: error.message };
  }
}

/**
 * 处理单个域名配置的 DDNS 同步
 * @param {object} config - 域名配置
 * @param {string} apiToken - API Token
 * @returns {Promise<object>} - 同步结果
 */
export async function processDomain(config, apiToken) {
  const { record_name, targets, proxied = false, ttl = 60 } = config;
  const result = {
    record_name,
    zone_name: '',
    status: 'pending',
    details: [],
    changes: { added: [], deleted: [], errors: [] }
  };

  try {
    // 1. 智能获取 Zone ID（自动从 record_name 提取）
    const { zoneId, zoneName } = await findZoneId(record_name, apiToken);
    result.zone_name = zoneName || '未知';

    if (!zoneId) {
      result.status = 'error';
      result.error = '未找到 Zone ID，请检查域名是否在 Cloudflare 管理';
      return result;
    }

    // 2. 解析目标 IP
    const { ips: desiredIps, details } = await resolveAllTargets(targets);
    result.details = details;

    if (desiredIps.length === 0) {
      result.status = 'warning';
      result.error = '未获取到任何目标 IP';
      return result;
    }

    // 3. 获取现有记录
    const currentRecords = await getCurrentRecords(zoneId, record_name, apiToken);
    const existingIpMap = {};
    for (const record of currentRecords) {
      existingIpMap[record.content] = record.id;
    }
    const existingIps = new Set(Object.keys(existingIpMap));
    const desiredIpsSet = new Set(desiredIps);

    // 4. 计算差异
    const ipsToAdd = desiredIps.filter(ip => !existingIps.has(ip));
    const ipsToDelete = Array.from(existingIps).filter(ip => !desiredIpsSet.has(ip));

    if (ipsToAdd.length === 0 && ipsToDelete.length === 0) {
      result.status = 'unchanged';
      return result;
    }

    // 5. 执行同步
    for (const ip of ipsToAdd) {
      const res = await addRecord(zoneId, record_name, ip, proxied, ttl, apiToken);
      if (res.success) {
        result.changes.added.push(ip);
      } else {
        result.changes.errors.push({ ip, action: 'add', error: res.error });
      }
    }

    for (const ip of ipsToDelete) {
      const res = await deleteRecord(zoneId, existingIpMap[ip], ip, apiToken);
      if (res.success) {
        result.changes.deleted.push(ip);
      } else {
        result.changes.errors.push({ ip, action: 'delete', error: res.error });
      }
    }

    result.status = result.changes.errors.length > 0 ? 'partial' : 'success';
    return result;

  } catch (error) {
    result.status = 'error';
    result.error = error.message;
    return result;
  }
}

/**
 * 执行所有域名的 DDNS 同步
 * @param {object[]} configs - 域名配置列表
 * @param {string} apiToken - API Token
 * @returns {Promise<object>}
 */
export async function syncAll(configs, apiToken) {
  const startTime = Date.now();
  const results = [];

  for (const config of configs) {
    const result = await processDomain(config, apiToken);
    results.push(result);
  }

  return {
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    total: configs.length,
    results
  };
}
