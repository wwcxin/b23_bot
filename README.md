# B23Bot

基于 NapCat 的 QQ 机器人框架

## 特性

- 插件系统
- 权限管理
- 消息格式化
- 命令系统

## 安装

```bash
# 克隆本项目
git clone https://github.com/wwcxin/b23_bot.git

# 进入项目目录
cd b23_bot

# 安装依赖
npm install
```

## 配置

napcat开启服务端ws

修改 config.toml 文件:

```toml
host = "127.0.0.1"  # 监听地址
port = 6700        # 监听端口
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