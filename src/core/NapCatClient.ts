import WebSocket from 'ws';
import { Config } from '../config';
import { EventEmitter } from './EventEmitter';
import { MessageEvent, RequestEvent, NoticeEvent } from './types';
import { segment } from './segment';
import { PluginManager } from './PluginManager';
import axios, { AxiosInstance } from 'axios';

interface GroupInfo {
    group_id: number;
    group_name: string;
    member_count: number;
    max_member_count: number;
}

interface MessageSegment {
    type: string;
    data: {
        [key: string]: any;
    };
}

export class NapCatClient {
    private ws: WebSocket | null = null;
    private config: Config;
    private reconnectAttempts = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 5;
    private groups: Map<number, GroupInfo> = new Map();
    private botInfo: {
        user_id: number;
        nickname: string;
    } | null = null;
    private eventEmitter: EventEmitter;
    private pluginManager: PluginManager;
    private lastSentMessage: string = '';

    public readonly segment = segment;
    public readonly http: AxiosInstance;

    constructor(config: Config) {
        this.config = config;
        this.eventEmitter = new EventEmitter();
        this.pluginManager = new PluginManager(this);

        // 初始化 HTTP 客户端
        this.http = axios.create({
            timeout: 10000, // 10秒超时
            headers: {
                'User-Agent': 'b23Bot/1.0.0'
            }
        });

        // 添加响应拦截器用于错误处理
        this.http.interceptors.response.use(
            response => response,
            error => {
                console.error(`[${this.formatTime()}] 🔴 HTTP请求失败:`, {
                    url: error.config?.url,
                    method: error.config?.method,
                    status: error.response?.status,
                    statusText: error.response?.statusText
                });
                throw error;
            }
        );
    }

    private async sendMessage(action: string, params: any = {}, echo: string = ''): Promise<void> {
        if (!this.isConnected()) {
            throw new Error('WebSocket 未连接');
        }

        // 如果是发送消息，记录格式化后的消息内容
        if (action.startsWith('send_') && action.endsWith('_msg')) {
            this.lastSentMessage = this.formatMessage(params.message);
        }

        const message = {
            action,
            params,
            echo
        };
        this.ws?.send(JSON.stringify(message));
    }

    private async getGroupList(): Promise<void> {
        try {
            await this.sendMessage('get_group_list', { no_cache: false }, 'get_group_list');
        } catch (error) {
            console.error('获取群列表失败:', error);
        }
    }

    private async getBotInfo(): Promise<void> {
        try {
            await this.sendMessage('get_login_info', {}, 'get_login_info');
        } catch (error) {
            console.error('获取机器人信息失败:', error);
        }
    }

    private async sendPrivateMessage(userId: number, message: string): Promise<void> {
        try {
            const messageData = {
                "type": "text",
                "data": {
                    "text": message
                }
            };

            await this.sendMessage('send_private_msg', {
                user_id: userId,
                message: [messageData]
            }, 'send_private_msg');
        } catch (error) {
            console.error(`[${this.formatTime()}] 🔴 发送私聊消息失败:`, error);
        }
    }

    private async notifyOwner(): Promise<void> {
        // 遍历配置中的 root 用户列表，向每个主人发送通知
        for (const rootId of this.config.root) {
            await this.sendPrivateMessage(rootId, "🤖 b23Bot已上线");
        }
    }

    private async initializeBot(): Promise<void> {
        try {
            // 1. 获取机器人信息
            await this.getBotInfo();
            // 等待获取机器人信息的响应处理完成
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (!this.botInfo) {
                throw new Error('获取机器人信息失败');
            }

            // 2. 显示欢迎信息
            console.log(`[${this.formatTime()}] 🟢 Welcome, ${this.botInfo.nickname}! 正在加载资源...`);

            // 3. 获取群列表
            await this.getGroupList();

            // 4. 通知主人机器人已上线
            await this.notifyOwner();

            // 加载插件
            await this.pluginManager.loadPlugins(this.config.plugins);

        } catch (error) {
            console.error(`[${this.formatTime()}] 🔴 初始化失败:`, error);
            throw error;
        }
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

    private formatMessage(message: MessageSegment[]): string {
        return message.map(seg => this.formatMessageSegment(seg)).join('');
    }

    private formatMessageSegment(segment: MessageSegment): string {
        switch (segment.type) {
            case 'text':
                return segment.data.text;
            case 'at':
                return `{at:${segment.data.qq}}`;
            case 'face':
                return `{face:${segment.data.id}}`;
            case 'image':
                // 从文件名中提取 MD5
                const md5 = segment.data.file.split('.')[0];
                return `{image:${md5}}`;
            case 'record':
                return `{record:${segment.data.file}}`;
            case 'video':
                return `{video:${segment.data.file}}`;
            default:
                return '';
        }
    }

    public async connect(): Promise<void> {
        const wsUrl = `ws://${this.config.host}:${this.config.port}`;
        
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(wsUrl);

                this.ws.on('open', async () => {
                    console.log(`[${this.formatTime()}] 🟢 已连接到 NapCat 服务器`);
                    this.reconnectAttempts = 0;
                    await this.initializeBot();
                    resolve();
                });

                this.ws.on('message', (data: WebSocket.RawData) => {
                    try {
                        const message = JSON.parse(data.toString());
                        
                        // 处理机器人信息响应
                        if (message.echo === 'get_login_info' && message.status === 'ok') {
                            this.botInfo = message.data;
                            return;
                        }

                        // 处理群列表响应
                        if (message.echo === 'get_group_list' && message.status === 'ok') {
                            this.groups.clear();
                            message.data.forEach((group: GroupInfo) => {
                                this.groups.set(group.group_id, group);
                            });
                            console.log(`[${this.formatTime()}] 🟢 成功加载 ${this.groups.size} 个群组`);
                            return;
                        }

                        // 处理发送消息的响应
                        if (message.echo?.startsWith('send_group_msg_') && message.status === 'ok') {
                            // 从 echo 中提取群号
                            const [,,,timestamp, groupId] = message.echo.split('_');
                            console.log(`[${this.formatTime()}] succeed to send: [Group(${groupId})] ${this.lastSentMessage}`);
                            return;
                        }

                        if (message.echo?.startsWith('send_private_msg_') && message.status === 'ok') {
                            // 从 echo 中提取用户 ID
                            const [,,,timestamp, userId] = message.echo.split('_');
                            console.log(`[${this.formatTime()}] succeed to send: [Private(${userId})] ${this.lastSentMessage}`);
                            return;
                        }

                        // 忽略心跳等元事件
                        if (message.post_type === 'meta_event') return;

                        switch (message.post_type) {
                            case 'message':
                                if (message.message_type === 'group') {
                                    const groupInfo = this.groups.get(message.group_id);
                                    message.group_name = groupInfo ? groupInfo.group_name : String(message.group_id);
                                    
                                    // 格式化群消息日志
                                    console.log(
                                        `[${this.formatTime()}] [Group: ${message.group_name}(${message.group_id}), ` +
                                        `Member: ${message.sender.card || message.sender.nickname}(${message.sender.user_id})] ` +
                                        this.formatMessage(message.message)
                                    );
                                } else {
                                    // 格式化私聊消息日志
                                    console.log(
                                        `[${this.formatTime()}] [Private: ${message.sender.nickname}(${message.sender.user_id})] ` +
                                        this.formatMessage(message.message)
                                    );
                                }
                                
                                // 扩展消息事件并发射
                                const extendedEvent = this.eventEmitter.extendMessageEvent(message, this);
                                this.eventEmitter.emit('message', extendedEvent);
                                this.eventEmitter.emit(`message.${message.message_type}`, extendedEvent);
                                break;
                            case 'request':
                                this.eventEmitter.emit('request', message as RequestEvent);
                                break;
                            case 'notice':
                                this.eventEmitter.emit('notice', message as NoticeEvent);
                                break;
                            default:
                                // console.log(`[${this.formatTime()}] [Unknown] `, message);
                                break;
                        }
                    } catch (error) {
                        console.error('🔴 消息解析失败:', error);
                    }
                });

                this.ws.on('close', () => {
                    console.log(`[${this.formatTime()}] 🔴 连接已关闭`);
                    this.handleReconnect();
                });

                this.ws.on('error', (error) => {
                    console.error(`[${this.formatTime()}] 🔴 WebSocket 错误:`, error);
                    reject(error);
                });

            } catch (error) {
                console.error(`[${this.formatTime()}] 🔴 连接创建失败:`, error);
                reject(error);
            }
        });
    }

    private async handleReconnect(): Promise<void> {
        if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            console.error(`[${this.formatTime()}] 🔴 达到最大重连次数，停止重连`);
            return;
        }

        this.reconnectAttempts++;
        console.log(`[${this.formatTime()}] 🔴 尝试重连 (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
        
        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                console.error(`[${this.formatTime()}] 🔴 重连失败:`, error);
            }
        }, 5000 * this.reconnectAttempts);
    }

    public disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    // 添加事件处理方法
    public handle(event: string, handler: (event: any) => void | Promise<void>): void {
        this.eventEmitter.on(event, handler);
    }

    // 添加一个工具方法用于获取纯文本消息
    public text(event: MessageEvent): string {
        if (typeof event.message === 'string') {
            return event.message;
        }
        return event.message
            .filter(seg => seg.type === 'text')
            .map(seg => seg.data.text)
            .join('');
    }

    // 添加管理员权限检查方法
    public isAdmin(userId: number): boolean {
        return this.config.admin?.includes(userId) || this.isRoot(userId);
    }

    // 添加主人权限检查方法
    public isRoot(userId: number): boolean {
        return this.config.root?.includes(userId);
    }

    // 添加主人
    public async addRoot(userId: number): Promise<void> {
        if (!this.config.root.includes(userId)) {
            this.config.root.push(userId);
            // TODO: 保存配置到文件
        }
    }

    // 添加管理员
    public async addAdmin(userId: number): Promise<void> {
        if (!this.config.admin) {
            this.config.admin = [];
        }
        if (!this.config.admin.includes(userId)) {
            this.config.admin.push(userId);
            // TODO: 保存配置到文件
        }
    }

    // 获取插件管理器
    public getPluginManager(): PluginManager {
        return this.pluginManager;
    }

    // 获取框架状态
    public getStatus(): any {
        return {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            plugins: this.pluginManager.getPluginStatus(),
            groups: this.groups.size,
            connected: this.isConnected()
        };
    }

    // 添加公共方法获取插件列表
    public getPluginList(): string[] {
        return this.config.plugins;
    }
} 