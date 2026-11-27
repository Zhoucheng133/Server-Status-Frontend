import { createI18n } from 'vue-i18n'

const messages = {
  zh: {
    lastUpdated: '上一次更新 {time}',
    auto: '自动', themeSwitch: '当前为{current}模式，点击切换到{next}模式',
    private: '仅管理员可见', lastSeen: '最近访问时段',
    site: '站点', allSites: '全部站点', privateNetwork: '私有网络', credentials: '用户名需为 2 至 64 个字符，密码需为 10 至 72 个 UTF-8 字节。',
    app: '服务器监控', dashboard: '概览', signIn: '登录', signOut: '退出登录', register: '创建管理员',
    subtitle: '服务器与网站访问概况', overview: '运行概况', live: '实时监控',
    cpu: 'CPU 使用率', memory: '内存使用率', inbound: '网络下行', outbound: '网络上行', requests: '网站访问量', countries: '访客来源',
    recentIPs: '访问来源明细', address: 'IP 地址', country: '国家 / 地区', visits: '访问次数', sourceSettings: '日志来源', chooseLogs: '选择要监控的日志文件', save: '保存设置', cancel: '取消',
    setupTitle: '初始化监控', setupText: '创建唯一管理员账户并选择至少一个 Caddy 日志文件。', setupAction: '开始初始化', loginTitle: '欢迎回来', loginText: '登录以查看实时状态和 IP 明细。',
    username: '用户名', password: '密码', confirmPassword: '确认密码', enter: '登录', createAccount: '创建账户', noLogs: '尚未配置日志来源', loading: '正在加载', noData: '暂无数据', last24: '最近 24 小时', refresh: '更新', configured: '已配置', notConfigured: '需要配置日志来源', saveError: '保存失败，请重试。', authError: '用户名或密码无效。', registerError: '无法创建账户，请检查填写内容。', passwordMismatch: '两次输入的密码不一致。', networkError: '暂时无法连接服务器。', settings: '设置', language: '语言', theme: '主题', dark: '深色', light: '浅色', unknown: '未知', perMinute: '次 / 5 分钟', noSources: '没有发现 JSON 日志文件。', backHome: '返回首页', setupFirstOnly: '系统仅允许创建一个管理员账户。',
  },
  en: {
    lastUpdated: 'Last updated {time}',
    auto: 'Automatic', themeSwitch: 'Current theme is {current}. Switch to {next}.',
    private: 'Admin only', lastSeen: 'Latest interval',
    site: 'Website', allSites: 'All websites', privateNetwork: 'Private network', credentials: 'Use a 2–64 character username and a 10–72 byte UTF-8 password.',
    app: 'Server Monitor', dashboard: 'Overview', signIn: 'Sign in', signOut: 'Sign out', register: 'Create admin',
    subtitle: 'Server health and website traffic', overview: 'System overview', live: 'Live monitoring',
    cpu: 'CPU usage', memory: 'Memory usage', inbound: 'Network in', outbound: 'Network out', requests: 'Website traffic', countries: 'Visitor locations',
    recentIPs: 'Recent visitors', address: 'IP address', country: 'Country / Region', visits: 'Visits', sourceSettings: 'Log sources', chooseLogs: 'Select Caddy log files to monitor', save: 'Save settings', cancel: 'Cancel',
    setupTitle: 'Set up monitoring', setupText: 'Create the single administrator account and choose at least one Caddy log file.', setupAction: 'Set up now', loginTitle: 'Welcome back', loginText: 'Sign in to view live status and IP details.',
    username: 'Username', password: 'Password', confirmPassword: 'Confirm password', enter: 'Sign in', createAccount: 'Create account', noLogs: 'No log sources configured', loading: 'Loading', noData: 'No data yet', last24: 'Last 24 hours', refresh: 'Refresh', configured: 'Configured', notConfigured: 'Log sources need setup', saveError: 'Could not save settings. Try again.', authError: 'Invalid username or password.', registerError: 'Could not create account. Check your details.', passwordMismatch: 'Passwords do not match.', networkError: 'Unable to reach the server.', settings: 'Settings', language: 'Language', theme: 'Theme', dark: 'Dark', light: 'Light', unknown: 'Unknown', perMinute: 'requests / 5 min', noSources: 'No JSON log files found.', backHome: 'Back to overview', setupFirstOnly: 'Only one administrator account can be created.',
  },
}

const saved = localStorage.getItem('language')
const i18n = createI18n({ legacy: false, locale: saved === 'en' ? 'en' : 'zh', fallbackLocale: 'en', messages })
export default i18n
