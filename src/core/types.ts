// 基础消息类型
export interface MessageSegment {
    type: string;
    data: {
        [key: string]: any;
    };
}

// 发送者信息
export interface Sender {
    user_id: number;
    nickname: string;
    card?: string;
    role?: 'owner' | 'admin' | 'member';
}

// 基础事件类型
export interface BaseEvent {
    post_type: 'message' | 'notice' | 'request' | 'meta_event';
    self_id: number;
    time: number;
}

// 消息事件类型
export interface MessageEvent extends BaseEvent {
    post_type: 'message';
    message_type: 'private' | 'group';
    sub_type: string;
    message_id: number;
    user_id: number;
    message: MessageSegment[];
    raw_message: string;
    font: number;
    sender: Sender;
    message_seq: number;
    group_id?: number;
    group_name?: string; // 我们添加的额外字段
}

// 扩展的消息事件，包含回复等方法
export interface ExtendedMessageEvent extends MessageEvent {
    reply: (message: (string | MessageSegment)[], quote?: boolean) => Promise<void>;
}

// 请求事件类型
export interface RequestEvent extends BaseEvent {
    post_type: 'request';
    request_type: 'friend' | 'group';
    user_id: number;
    comment: string;
    flag: string;
    approve: () => Promise<void>;
    reject: () => Promise<void>;
}

// 通知事件类型
export interface NoticeEvent extends BaseEvent {
    post_type: 'notice';
    notice_type: string;
    user_id: number;
    group_id?: number;
} 