import * as fs from 'fs/promises';
import * as TOML from 'toml';
import { join } from 'path';

export interface Config {
    host: string;
    port: number;
    root: number[];
    admin: number[];
    plugins: string[];
}

export async function readConfig(): Promise<Config> {
    try {
        const configPath = join(process.cwd(), 'config.toml');
        const configContent = await fs.readFile(configPath, 'utf-8');
        return TOML.parse(configContent) as Config;
    } catch (error) {
        throw new Error(`配置文件读取失败: ${error}`);
    }
} 