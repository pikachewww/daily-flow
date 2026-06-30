# 腾讯云部署方案

本项目最终生产部署采用腾讯云方案，优先服务微信小程序正式发布和国内稳定访问。

## 目标架构

```text
微信小程序
  -> HTTPS 合法域名
  -> 腾讯云轻量应用服务器 / CVM
  -> Caddy 自动 HTTPS
  -> Node.js API
  -> SQLite 持久化卷

预留：
  -> 腾讯云 COS：头像、图片、导出文件、备份
  -> TencentDB MySQL：多用户阶段迁移
```

## 1. GitHub 项目

代码仓库：

```text
https://github.com/pikachewww/daily-flow
```

后续所有部署都从 `main` 分支拉取。

## 2. 购买腾讯云资源

个人长期使用推荐从低成本开始：

- 腾讯云轻量应用服务器，地域选择中国大陆离你近的地域。
- 系统镜像选择 Ubuntu LTS。
- 最低配置即可起步，后续可升级。
- 域名使用腾讯云 DNSPod 管理。
- 文件存储预留腾讯云 COS。

数据库当前使用 SQLite 持久化卷，数据文件保存在 Docker volume。后续多用户阶段迁移到 TencentDB MySQL。

## 3. 域名解析

准备一个 API 域名，例如：

```text
api.your-domain.com
```

在 DNSPod 添加 A 记录：

```text
主机记录：api
记录类型：A
记录值：你的腾讯云服务器公网 IP
```

等待解析生效。

## 4. 服务器初始化

登录服务器：

```bash
ssh root@你的服务器 IP
```

安装基础工具和 Docker：

```bash
apt update
apt install -y git ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 5. 拉取项目

```bash
mkdir -p /opt/yidian
cd /opt/yidian
git clone https://github.com/pikachewww/daily-flow.git .
```

## 6. 配置生产环境变量

```bash
cd /opt/yidian/deploy/tencent
cp .env.production.example .env.production
```

编辑 `.env.production`：

```text
NODE_ENV=production
PORT=3001
DATABASE_PATH=/var/data/checkin.sqlite
API_DOMAIN=api.your-domain.com
ACME_EMAIL=you@example.com
CORS_ORIGIN=*
AI_PROVIDER=local
```

AI Key 全部放环境变量，不写进代码：

```text
OPENAI_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
CLAUDE_API_KEY=
```

后续上传头像、图片时启用 COS：

```text
TENCENT_SECRET_ID=
TENCENT_SECRET_KEY=
TENCENT_COS_BUCKET=
TENCENT_COS_REGION=ap-guangzhou
```

## 7. 启动后端

```bash
cd /opt/yidian/deploy/tencent
docker compose up -d --build
```

查看状态：

```bash
docker compose ps
docker compose logs -f backend
```

验证：

```bash
curl https://api.your-domain.com/health
curl https://api.your-domain.com/api/checkin/today
```

Caddy 会自动申请和续期 HTTPS 证书。

## 8. 数据备份

当前 SQLite 数据保存在 Docker volume `tencent_yidian_data`。

建议每日备份到本机文件，后续再同步到 COS：

```bash
mkdir -p /opt/yidian/backups
docker run --rm -v tencent_yidian_data:/data -v /opt/yidian/backups:/backup alpine sh -c "cp /data/checkin.sqlite /backup/checkin-$(date +%F).sqlite"
```

后续可用 COS CLI 或定时任务把 `/opt/yidian/backups` 同步到腾讯云 COS。

## 9. 小程序配置

修改：

```text
frontend/miniprogram/utils/config.js
```

将：

```js
apiBaseUrl: "http://localhost:3001/api"
```

改为：

```js
apiBaseUrl: "https://api.your-domain.com/api"
```

提交并推送：

```bash
git add frontend/miniprogram/utils/config.js
git commit -m "Configure production API for miniprogram"
git push
```

## 10. 微信公众平台配置

进入微信公众平台：

```text
开发管理 -> 开发设置 -> 服务器域名
```

添加 request 合法域名：

```text
https://api.your-domain.com
```

正式环境必须使用 HTTPS，不能使用 localhost。

## 11. 微信开发者工具上传

1. 打开微信开发者工具。
2. 导入：

```text
frontend/miniprogram
```

3. 使用真实 AppID。
4. 本地预览确认无误。
5. 点击“上传”。
6. 到微信公众平台提交审核。
7. 审核通过后发布。

## 12. 后续升级路线

当需要多用户/微信登录时：

1. 新增用户表。
2. 所有业务表增加 `user_id`。
3. API 增加登录态校验。
4. 数据库迁移到 TencentDB MySQL。
5. COS 用于图片和导出文件。

这个升级不会推翻当前小程序前端和 API 设计，只需要扩展后端数据层和鉴权层。
