/**
 * DDNS 核心逻辑 - 支持 IPv4 (A) 和 IPv6 (AAAA) 记录
 */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const DOH_URL = 'https://cloudflare-dns.com/dns-query';

/**
 * 从 record_name 提取 zone_name
 */
export function extractZoneName(recordName) {
  const parts = recordName.split('.');
  const possibilities = [];
  for (let i = parts.length - 2; i >= 0; i--) {
    possibilities.push(parts.slice(i).join('.'));
  }
  return possibilities;
}

/**
 * 智能获取 Zone ID
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
 * 使用 DNS over HTTPS 解析域名
 * @param {string} domain - 要解析的域名
 * @param {string} type - 记录类型: 'A' 或 'AAAA'
 * @returns {Promise<string[]>} - IP 地址列表
 */
export async function resolveDNS(domain, type = 'A') {
  try {
    const url = `${DOH_URL}?name=${encodeURIComponent(domain)}&type=${type}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/dns-json' }
    });

    if (!response.ok) {
      throw new Error(`DoH request failed: ${response.status}`);
    }

    const data = await response.json();
    const ips = [];

    if (data.Answer) {
      // Type 1 = A, Type 28 = AAAA
      const expectedType = type === 'A' ? 1 : 28;
      for (const answer of data.Answer) {
        if (answer.type === expectedType) {
          ips.push(answer.data);
        }
      }
    }

    return ips;
  } catch (error) {
    console.error(`解析 ${domain} (${type}) 失败:`, error.message);
    return [];
  }
}

/**
 * 解析多个目标域名的所有 IP
 * @param {string[]} targets - 目标域名列表
 * @param {boolean} enableIPv4 - 是否解析 IPv4
 * @param {boolean} enableIPv6 - 是否解析 IPv6
 */
export async function resolveAllTargets(targets, enableIPv4 = true, enableIPv6 = true) {
  const ipv4List = [];
  const ipv6List = [];
  const details = [];

  for (const domain of targets) {
    const detail = { domain, ipv4: [], ipv6: [] };

    if (enableIPv4) {
      detail.ipv4 = await resolveDNS(domain, 'A');
      detail.ipv4.forEach(ip => ipv4List.push(ip));
    }

    if (enableIPv6) {
      detail.ipv6 = await resolveDNS(domain, 'AAAA');
      detail.ipv6.forEach(ip => ipv6List.push(ip));
    }

    details.push(detail);
  }

  return {
    ipv4: [...new Set(ipv4List)],
    ipv6: [...new Set(ipv6List)],
    details
  };
}

/**
 * 获取 Zone ID
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
    return null;
  } catch (error) {
    console.error(`获取 Zone ID 失败:`, error.message);
    return null;
  }
}

/**
 * 获取当前的 DNS 记录
 * @param {string} type - 'A' 或 'AAAA'
 */
export async function getCurrentRecords(zoneId, recordName, type, apiToken) {
  try {
    const url = `${CF_API_BASE}/zones/${zoneId}/dns_records?name=${encodeURIComponent(recordName)}&type=${type}&per_page=100`;
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
 * @param {string} type - 'A' 或 'AAAA'
 */
export async function addRecord(zoneId, name, ip, type, proxied, ttl, apiToken) {
  try {
    const url = `${CF_API_BASE}/zones/${zoneId}/dns_records`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: type,
        name: name,
        content: ip,
        ttl: ttl,
        proxied: proxied
      })
    });

    const data = await response.json();
    return { success: data.success, ip, type, action: 'add' };
  } catch (error) {
    return { success: false, ip, type, action: 'add', error: error.message };
  }
}

/**
 * 删除 DNS 记录
 */
export async function deleteRecord(zoneId, recordId, ip, type, apiToken) {
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
    return { success: data.success, ip, type, action: 'delete' };
  } catch (error) {
    return { success: false, ip, type, action: 'delete', error: error.message };
  }
}

/**
 * 同步指定类型的 DNS 记录
 */
async function syncRecordType(zoneId, recordName, desiredIps, type, proxied, ttl, apiToken) {
  const changes = { added: [], deleted: [], errors: [] };

  // 获取现有记录
  const currentRecords = await getCurrentRecords(zoneId, recordName, type, apiToken);
  const existingIpMap = {};
  for (const record of currentRecords) {
    existingIpMap[record.content] = record.id;
  }
  const existingIps = new Set(Object.keys(existingIpMap));
  const desiredIpsSet = new Set(desiredIps);

  // 计算差异
  const ipsToAdd = desiredIps.filter(ip => !existingIps.has(ip));
  const ipsToDelete = Array.from(existingIps).filter(ip => !desiredIpsSet.has(ip));

  // 添加新记录
  for (const ip of ipsToAdd) {
    const res = await addRecord(zoneId, recordName, ip, type, proxied, ttl, apiToken);
    if (res.success) {
      changes.added.push(ip);
    } else {
      changes.errors.push({ ip, type, action: 'add', error: res.error });
    }
  }

  // 删除旧记录
  for (const ip of ipsToDelete) {
    const res = await deleteRecord(zoneId, existingIpMap[ip], ip, type, apiToken);
    if (res.success) {
      changes.deleted.push(ip);
    } else {
      changes.errors.push({ ip, type, action: 'delete', error: res.error });
    }
  }

  return changes;
}

/**
 * 处理单个域名配置的 DDNS 同步
 */
export async function processDomain(config, apiToken) {
  const {
    record_name,
    targets,
    proxied = false,
    ttl = 60,
    enable_ipv4 = true,
    enable_ipv6 = true
  } = config;

  const result = {
    record_name,
    zone_name: '',
    status: 'pending',
    details: [],
    ipv4: { added: [], deleted: [], errors: [] },
    ipv6: { added: [], deleted: [], errors: [] }
  };

  try {
    // 1. 获取 Zone ID
    const { zoneId, zoneName } = await findZoneId(record_name, apiToken);
    result.zone_name = zoneName || '未知';

    if (!zoneId) {
      result.status = 'error';
      result.error = '未找到 Zone ID';
      return result;
    }

    // 2. 解析目标 IP
    const { ipv4, ipv6, details } = await resolveAllTargets(targets, enable_ipv4, enable_ipv6);
    result.details = details;

    if (ipv4.length === 0 && ipv6.length === 0) {
      result.status = 'warning';
      result.error = '未获取到任何目标 IP';
      return result;
    }

    // 3. 同步 IPv4 (A 记录)
    if (enable_ipv4) {
      result.ipv4 = await syncRecordType(zoneId, record_name, ipv4, 'A', proxied, ttl, apiToken);
    }

    // 4. 同步 IPv6 (AAAA 记录)
    if (enable_ipv6) {
      result.ipv6 = await syncRecordType(zoneId, record_name, ipv6, 'AAAA', proxied, ttl, apiToken);
    }

    // 5. 判断状态
    const totalChanges = result.ipv4.added.length + result.ipv4.deleted.length +
      result.ipv6.added.length + result.ipv6.deleted.length;
    const totalErrors = result.ipv4.errors.length + result.ipv6.errors.length;

    if (totalErrors > 0) {
      result.status = 'partial';
    } else if (totalChanges === 0) {
      result.status = 'unchanged';
    } else {
      result.status = 'success';
    }

    return result;

  } catch (error) {
    result.status = 'error';
    result.error = error.message;
    return result;
  }
}

/**
 * 执行所有域名的 DDNS 同步
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
