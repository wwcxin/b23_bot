# B23Bot

基于 NapCat 的 QQ 机器人框架

## 特性

- 插件系统
- 权限管理
- 消息格式化
- 命令系统

## 安装

```bash
npm install b23_bot
```

## 配置

创建 config.toml 文件:

```toml
host = "127.0.0.1"
port = 6700
root = [123456789]  # 主人QQ号
admin = []  # 管理员QQ号
plugins = ["cmd", "demo"]  # 启用的插件
```

## 使用

```bash
# 开发
npm run dev

# 构建
npm run build

# 运行
npm start
```

## 插件开发

参考 plugins/demo/index.ts