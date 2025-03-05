import { BaseEvent, MessageEvent, RequestEvent, NoticeEvent, ExtendedMessageEvent, MessageSegment } from './types';

type EventHandler<T> = (event: T) => void | Promise<void>;

export class EventEmitter {
    private handlers: Map<string, Set<EventHandler<any>>> = new Map();

    // 注册事件处理器
    on<T extends BaseEvent>(event: string, handler: EventHandler<T>): void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)?.add(handler);
    }

    // 移除事件处理器
    off<T extends BaseEvent>(event: string, handler: EventHandler<T>): void {
        this.handlers.get(event)?.delete(handler);
    }

    // 触发事件
    async emit(event: string, data: BaseEvent): Promise<void> {
        const handlers = this.handlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    await handler(data);
                } catch (error) {
                    console.error(`[EventEmitter] 事件处理错误:`, error);
                }
            }
        }
    }

    // 扩展消息事件
    extendMessageEvent(event: MessageEvent, client: any): ExtendedMessageEvent {
        const extended = event as ExtendedMessageEvent;

        // 添加回复方法
        extended.reply = async (message: (string | MessageSegment)[], quote = false) => {
            const messageArray: MessageSegment[] = [];

            // 如果需要引用回复
            if (quote) {
                messageArray.push({
                    type: 'reply',
                    data: {
                        id: event.message_id
                    }
                });
            }

            // 处理消息内容：将字符串转换为 text 类型的消息段
            message.forEach(item => {
                if (typeof item === 'string') {
                    messageArray.push({
                        type: 'text',
                        data: {
                            text: item
                        }
                    });
                } else {
                    messageArray.push(item);
                }
            });

            const params: any = {
                message: messageArray
            };

            // 根据消息类型设置目标
            if (event.message_type === 'group') {
                params.group_id = event.group_id;
                await client.sendMessage(
                    'send_group_msg',
                    params,
                    `send_group_msg_${Date.now()}_${params.group_id}`
                );
            } else {
                params.user_id = event.user_id;
                await client.sendMessage(
                    'send_private_msg',
                    params,
                    `send_private_msg_${Date.now()}_${params.user_id}`
                );
            }
        };

        return extended;
    }
} 