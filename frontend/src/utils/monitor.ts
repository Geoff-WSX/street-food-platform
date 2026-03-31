/**
 * 项目问题监控器
 * 实时检测并记录项目运行中的问题
 */

interface Issue {
  id: string;
  timestamp: Date;
  type: 'api_error' | 'validation_error' | 'runtime_error' | 'warning' | 'type_mismatch';
  source: string;
  message: string;
  details?: any;
  resolved: boolean;
}

class ProjectMonitor {
  private issues: Issue[] = [];
  private maxIssues = 100;

  // 添加问题
  addIssue(issue: Omit<Issue, 'id' | 'timestamp' | 'resolved'>) {
    const newIssue: Issue = {
      ...issue,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      resolved: false,
    };

    this.issues.unshift(newIssue);
    if (this.issues.length > this.maxIssues) {
      this.issues.pop();
    }

    // 控制台输出
    console.group(`🔍 [监控] ${issue.type}`);
    console.log(`来源: ${issue.source}`);
    console.log(`消息: ${issue.message}`);
    if (issue.details) {
      console.log('详情:', issue.details);
    }
    console.groupEnd();

    return newIssue;
  }

  // 标记问题已解决
  resolve(id: string) {
    const issue = this.issues.find(i => i.id === id);
    if (issue) {
      issue.resolved = true;
    }
  }

  // 获取未解决的问题
  getUnresolved() {
    return this.issues.filter(i => !i.resolved);
  }

  // 获取问题统计
  getStats() {
    const unresolved = this.getUnresolved();
    return {
      total: this.issues.length,
      unresolved: unresolved.length,
      byType: {
        api_error: unresolved.filter(i => i.type === 'api_error').length,
        validation_error: unresolved.filter(i => i.type === 'validation_error').length,
        runtime_error: unresolved.filter(i => i.type === 'runtime_error').length,
        warning: unresolved.filter(i => i.type === 'warning').length,
        type_mismatch: unresolved.filter(i => i.type === 'type_mismatch').length,
      },
    };
  }

  // 生成简洁报告
  generateReport() {
    const unresolved = this.getUnresolved();
    if (unresolved.length === 0) {
      return '✅ 项目运行正常，无已知问题';
    }

    const stats = this.getStats();
    const lines = [`📋 项目问题报告 (${stats.unresolved} 个未解决)`];

    // 按类型分组
    const grouped = new Map<string, Issue[]>();
    unresolved.forEach(issue => {
      const key = issue.type;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(issue);
    });

    for (const [type, issues] of grouped) {
      lines.push(`\n🔴 [${type}] ${issues.length} 个:`);
      issues.slice(0, 3).forEach(issue => {
        lines.push(`   - ${issue.source}: ${issue.message}`);
      });
      if (issues.length > 3) {
        lines.push(`   ... 还有 ${issues.length - 3} 个类似问题`);
      }
    }

    return lines.join('\n');
  }

  // 获取完整的未解决问题列表
  getFullReport() {
    const unresolved = this.getUnresolved();
    return unresolved.map(issue => ({
      id: issue.id,
      type: issue.type,
      source: issue.source,
      message: issue.message,
      timestamp: issue.timestamp.toISOString(),
      details: issue.details,
    }));
  }

  // 清除所有问题
  clear() {
    this.issues = [];
  }
}

// 全局单例
export const projectMonitor = new ProjectMonitor();

// 自动捕获 console.error
const originalError = console.error;
console.error = (...args: any[]) => {
  const message = args[0];
  if (typeof message === 'string' && !message.includes('[监控]')) {
    // 检查是否是 API 错误
    if (message.includes('❌')) {
      const parts = message.split(':');
      projectMonitor.addIssue({
        type: 'api_error',
        source: parts[0]?.replace('❌', '').trim() || 'Unknown',
        message: parts.slice(1).join(':').trim(),
      });
    }
  }
  originalError.apply(console, args);
};

// 导出便捷方法
export const reportIssue = (type: Issue['type'], source: string, message: string, details?: any) => {
  return projectMonitor.addIssue({ type, source, message, details });
};

// 浏览器快捷键: Ctrl+Shift+M 显示问题报告
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      console.log('\n' + '='.repeat(50));
      console.log(projectMonitor.generateReport());
      console.log('='.repeat(50));
      console.log('\n💡 复制上方报告给 Claude Code 进行修复');
    }
  });
}
