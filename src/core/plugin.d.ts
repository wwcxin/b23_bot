import { NapCatClient } from './NapCatClient';

export interface Plugin {
    name: string;
    version: string;
    setup: (ctx: NapCatClient) => void;
}

export function definePlugin(plugin: Plugin): Plugin; 