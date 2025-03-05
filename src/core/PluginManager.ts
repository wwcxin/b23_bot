import { join } from 'path';
import * as fs from 'fs/promises';
import * as TOML from 'toml';
import { NapCatClient } from './NapCatClient';

interface Plugin {
    name: string;
    version: string;
    setup: (ctx: NapCatClient) => void;
}

interface PluginDefinition {
    name: string;
    version: string;
    setup: (ctx: NapCatClient) => void;
}

export function definePlugin(plugin: PluginDefinition): Plugin {
    return plugin;
}

export class PluginManager {
    private plugins: Map<string, Plugin> = new Map();
    private client: NapCatClient;
    private configPath: string;

    constructor(client: NapCatClient) {
        this.client = client;
        this.configPath = join(process.cwd(), 'config.toml');
    }

    // 获取插件状态
    public getPluginStatus() {
        return {
            total: this.plugins.size,
            list: Array.from(this.plugins.entries()).map(([name, plugin]) => ({
                name,
                version: plugin.version,
                enabled: this.client.getPluginList().includes(name)
            }))
        };
    }

    // 启用插件
    public async enablePlugin(name: string): Promise<void> {
        // 读取配置文件
        const configContent = await fs.readFile(this.configPath, 'utf-8');
        const config = TOML.parse(configContent);

        // 检查插件是否已启用
        if (config.plugins.includes(name)) {
            throw new Error('插件已启用');
        }

        // 检查插件目录是否存在
        const pluginPath = join(process.cwd(), 'plugins', name);
        try {
            await fs.access(pluginPath);
        } catch {
            throw new Error('插件不存在');
        }

        // 添加到插件列表
        config.plugins.push(name);

        // 保存配置
        await fs.writeFile(this.configPath, this.toTOML(config));

        // 加载插件
        await this.loadPlugin(name);
    }

    // 禁用插件
    public async disablePlugin(name: string): Promise<void> {
        // 读取配置文件
        const configContent = await fs.readFile(this.configPath, 'utf-8');
        const config = TOML.parse(configContent);

        // 检查插件是否已禁用
        if (!config.plugins.includes(name)) {
            throw new Error('插件未启用');
        }

        // 从插件列表移除
        config.plugins = config.plugins.filter((p: string) => p !== name);

        // 保存配置
        await fs.writeFile(this.configPath, this.toTOML(config));

        // 从内存中移除插件
        this.plugins.delete(name);
    }

    // 重载插件
    public async reloadPlugin(name: string): Promise<void> {
        // 读取配置文件
        const configContent = await fs.readFile(this.configPath, 'utf-8');
        const config = TOML.parse(configContent);

        // 如果插件未启用，尝试启用它
        if (!config.plugins.includes(name)) {
            console.log(`[${this.formatTime()}] 插件 ${name} 未启用，尝试启用...`);
            await this.enablePlugin(name);
            return;
        }

        // 从内存中移除插件
        this.plugins.delete(name);

        // 重新加载插件
        await this.loadPlugin(name);
    }

    // 加载单个插件
    private async loadPlugin(name: string): Promise<void> {
        try {
            const pluginPath = join(process.cwd(), 'plugins', name);
            
            // 动态导入插件
            const plugin = (await import(join(pluginPath, 'index.ts'))).default;

            // 验证插件格式
            if (!this.validatePlugin(plugin)) {
                throw new Error('插件格式无效');
            }

            // 检查插件名称是否匹配目录名
            if (plugin.name !== name) {
                throw new Error('插件名称与目录名不匹配');
            }

            // 初始化插件
            plugin.setup(this.client);
            this.plugins.set(plugin.name, plugin);

            console.log(`[${this.formatTime()}] 🟢 成功加载插件: ${plugin.name} v${plugin.version}`);
        } catch (error) {
            console.error(`[${this.formatTime()}] 🔴 加载插件失败: ${name}`, error);
            throw error;
        }
    }

    // 将对象转换为 TOML 格式
    private toTOML(config: any): string {
        let toml = '';
        
        // 处理基本配置
        toml += `host = "${config.host}"\n`;
        toml += `port = ${config.port}\n\n`;
        
        // 处理数组
        toml += `root = [${config.root.join(', ')}]\n`;
        toml += `admin = [${config.admin.join(', ')}]\n`;
        toml += `plugins = [${config.plugins.map((p: string) => `"${p}"`).join(', ')}]\n`;
        
        return toml;
    }

    async loadPlugins(pluginNames: string[]): Promise<void> {
        try {
            console.log(`[${this.formatTime()}] 🟢 开始加载插件...`);

            for (const pluginName of pluginNames) {
                try {
                    const pluginPath = join(process.cwd(), 'plugins', pluginName);
                    
                    // 检查插件目录是否存在
                    try {
                        await fs.access(pluginPath);
                    } catch {
                        console.error(`[${this.formatTime()}] 🔴 插件目录不存在: ${pluginName}`);
                        continue;
                    }

                    // 动态导入插件
                    const plugin = (await import(join(pluginPath, 'index.ts'))).default;

                    // 验证插件格式
                    if (!this.validatePlugin(plugin)) {
                        console.error(`[${this.formatTime()}] 🔴 插件格式无效: ${pluginName}`);
                        continue;
                    }

                    // 检查插件名称是否匹配目录名
                    if (plugin.name !== pluginName) {
                        console.error(`[${this.formatTime()}] 🔴 插件名称与目录名不匹配: ${pluginName}`);
                        continue;
                    }

                    // 初始化插件
                    plugin.setup(this.client);
                    this.plugins.set(plugin.name, plugin);

                    console.log(`[${this.formatTime()}] 🟢 成功加载插件: ${plugin.name} v${plugin.version}`);
                } catch (error) {
                    console.error(`[${this.formatTime()}] 🔴 加载插件失败: ${pluginName}`, error);
                }
            }

            console.log(`[${this.formatTime()}] 🟢 插件加载完成，共加载 ${this.plugins.size} 个插件`);
        } catch (error) {
            console.error(`[${this.formatTime()}] 🔴 插件加载过程出错:`, error);
        }
    }

    private validatePlugin(plugin: any): plugin is Plugin {
        return (
            typeof plugin === 'object' &&
            typeof plugin.name === 'string' &&
            typeof plugin.version === 'string' &&
            typeof plugin.setup === 'function'
        );
    }

    private formatTime(): string {
        return new Date().toLocaleString('zh-CN', {
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
} 