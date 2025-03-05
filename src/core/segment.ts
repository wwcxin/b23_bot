// 定义消息元素类型
export interface TextElem {
    type: 'text';
    data: {
        text: string;
    };
}

export interface FaceElem {
    type: 'face';
    data: {
        id: string;
    };
}

export interface AtElem {
    type: 'at';
    data: {
        qq: string | number;
        name?: string;
    };
}

export interface ImageElem {
    type: 'image';
    data: {
        file: string;
        cache?: string;
        timeout?: string;
        headers?: Record<string, string>;
    };
}

export interface RecordElem {
    type: 'record';
    data: {
        file: string;
        url?: string;
    };
}

export interface VideoElem {
    type: 'video';
    data: {
        file: string;
        url?: string;
    };
}

// 创建消息段构造器
export const segment = {
    /** 文本消息 */
    text(text: string): TextElem {
        return {
            "type": "text",
            "data": {
                "text": text
            }
        };
    },

    /** 表情消息 */
    face(id: string): FaceElem {
        return {
            "type": "face",
            "data": {
                "id": id
            }
        };
    },

    /** @提及 */
    at(qq: number | "all" | string, name?: string): AtElem {
        return {
            "type": "at",
            "data": {
                "qq": typeof qq === 'number' ? String(qq) : qq,
                ...(name ? { "name": name } : {})
            }
        };
    },

    /** 图片消息 */
    image(
        file: string | Buffer,
        cache: boolean = true,
        timeout?: number,
        headers?: Record<string, string>
    ): ImageElem {
        const fileStr = Buffer.isBuffer(file) ? `base64://${file.toString('base64')}` : file;
        return {
            "type": "image",
            "data": {
                "file": fileStr,
                "cache": String(cache),
                ...(timeout ? { "timeout": String(timeout) } : {}),
                ...(headers ? { "headers": headers } : {})
            }
        };
    },

    /** 语音消息 */
    record(file: string): RecordElem {
        return {
            "type": "record",
            "data": {
                "file": file,
            }
        };
    },

    /** 视频消息 */
    video(file: string | Buffer, data: any = {}): VideoElem {
        const fileStr = Buffer.isBuffer(file) ? `base64://${file.toString('base64')}` : file;
        return {
            "type": "video",
            "data": {
                "file": fileStr,
                ...Object.entries(data).reduce((acc, [key, value]) => ({
                    ...acc,
                    [key]: typeof value === 'number' ? String(value) : value
                }), {})
            }
        };
    }
}; 