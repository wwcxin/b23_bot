import { definePlugin } from '../../src/core/PluginManager';
import { segment } from '../../src/core/segment';
import { ExtendedMessageEvent } from '../../src/core/types';

const helpText = `命令帮助:
.status - 查看框架状态
.plugin list - 查看插件列表
.plugin enable <name> - 启用插件
.plugin disable <name> - 禁用插件
.plugin reload <name> - 重载插件
.admin add <qq> - 添加管理员
.root add <qq> - 添加主人
注: 部分命令需要管理员或主人权限`;

export default definePlugin({
    name: 'cmd',
    version: '1.0.0',
    setup(ctx) {
        ctx.handle('message', async (e: ExtendedMessageEvent) => {
            const text = ctx.text(e);
            if (!text.startsWith('.')) return;

            const [cmd, ...args] = text.slice(1).split(' ');

            try {
                switch (cmd) {
                    case 'help':
                        return e.reply([helpText]);

                    case 'status':
                        if (!ctx.isAdmin(e.user_id)) {
                            return e.reply(['权限不足']);
                        }
                        const status = ctx.getStatus();
                        return e.reply([
                            `框架状态:\n` +
                            `运行时间: ${Math.floor(status.uptime / 3600)}小时${Math.floor((status.uptime % 3600) / 60)}分钟\n` +
                            `内存占用: ${Math.floor(status.memory.heapUsed / 1024 / 1024)}MB\n` +
                            `已加载插件: ${status.plugins.total}个\n` +
                            `已加入群组: ${status.groups}个\n` +
                            `连接状态: ${status.connected ? '已连接' : '未连接'}`
                        ]);

                    case 'plugin':
                        if (!ctx.isAdmin(e.user_id)) {
                            return e.reply(['权限不足']);
                        }
                        const pluginManager = ctx.getPluginManager();
                        
                        switch (args[0]) {
                            case 'list':
                                const plugins = pluginManager.getPluginStatus();
                                return e.reply([
                                    `插件列表(${plugins.total}个):\n` +
                                    plugins.list.map(p => `${p.name} v${p.version} [${p.enabled ? '启用' : '禁用'}]`).join('\n')
                                ]);

                            case 'enable':
                                if (!args[1]) return e.reply(['请指定插件名']);
                                await pluginManager.enablePlugin(args[1]);
                                return e.reply([`已启用插件: ${args[1]}`]);

                            case 'disable':
                                if (!args[1]) return e.reply(['请指定插件名']);
                                await pluginManager.disablePlugin(args[1]);
                                return e.reply([`已禁用插件: ${args[1]}`]);

                            case 'reload':
                                if (!args[1]) return e.reply(['请指定插件名']);
                                await pluginManager.reloadPlugin(args[1]);
                                return e.reply([`已重载插件: ${args[1]}`]);
                        }
                        break;

                    case 'admin':
                        if (!ctx.isRoot(e.user_id)) {
                            return e.reply(['权限不足']);
                        }
                        if (args[0] === 'add' && args[1]) {
                            const userId = parseInt(args[1]);
                            if (isNaN(userId)) return e.reply(['无效的QQ号']);
                            await ctx.addAdmin(userId);
                            return e.reply([`已添加管理员: ${userId}`]);
                        }
                        break;

                    case 'root':
                        if (!ctx.isRoot(e.user_id)) {
                            return e.reply(['权限不足']);
                        }
                        if (args[0] === 'add' && args[1]) {
                            const userId = parseInt(args[1]);
                            if (isNaN(userId)) return e.reply(['无效的QQ号']);
                            await ctx.addRoot(userId);
                            return e.reply([`已添加主人: ${userId}`]);
                        }
                        break;
                }
            } catch (err) {
                console.error('命令执行错误:', err);
            }
        });
    }
}); 