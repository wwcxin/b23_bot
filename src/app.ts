import { WebSocket } from 'ws';
import { readConfig } from './config';
import { NapCatClient } from './core/NapCatClient';

async function main() {
    try {
        // 读取配置文件
        const config = await readConfig();
        console.log('配置加载成功:', config);

        // 创建NapCat客户端实例
        const client = new NapCatClient(config);
        
        // 连接到服务器
        await client.connect();
        
        // 保持进程运行
        process.on('SIGINT', () => {
            console.log('正在关闭连接...');
            client.disconnect();
            process.exit(0);
        });
    } catch (error) {
        console.error('启动失败:', error);
        process.exit(1);
    }
}

main(); 