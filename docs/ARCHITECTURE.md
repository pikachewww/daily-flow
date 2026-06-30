# 一点长期架构

## 长期原则

这个项目按个人长期使用的小程序维护，不按 Demo 处理。

- 优先稳定、安全、可维护、易扩展。
- 默认面向微信小程序和国内访问环境。
- 最终部署采用腾讯云方案，不使用 Render、Vercel 等海外平台作为正式生产方案。
- 所有正式数据进入后端数据库，不使用 `localStorage` 保存正式数据。
- AI Provider 通过环境变量切换；没有 API Key 时使用本地规则降级。

## 推荐生产架构

```text
微信小程序
  |
  | HTTPS request 合法域名
  v
腾讯云轻量应用服务器 / CVM
  |
  | Caddy 自动 HTTPS + 反向代理
  v
Node.js API 服务
  |
  | Repository 层
  v
SQLite 持久卷（当前个人版）

腾讯云 COS（预留）
  - 头像
  - 图片
  - 导出文件
  - 备份文件

AI Provider（环境变量切换）
  - local fallback
  - OpenAI
  - Gemini
  - Claude
  - DeepSeek
```

## 数据库路线

当前阶段是个人单用户小程序，使用 SQLite + 腾讯云服务器持久卷，维护成本最低，备份简单，性能足够。

后续出现以下情况时迁移到 TencentDB MySQL：

- 增加微信登录和多用户。
- 需要多设备并发同步。
- 数据量增长明显。
- 需要平台级自动备份、只读实例或更强审计。

迁移时保持 API 层不变，只替换 Repository/Database 层，避免推翻前端和业务逻辑。

## 模块职责

```text
frontend/miniprogram
  微信小程序正式前端

frontend/web
  本地调试/后续管理后台预留

backend/src/app.js
  HTTP 路由、CORS、错误处理

backend/src/repositories
  数据访问层，后续迁移 MySQL 时优先修改这里

backend/src/services
  统计、AI 总结等业务服务

backend/src/validators
  参数校验

deploy/tencent
  腾讯云生产部署配置
```

## 已持久化的数据

- 打卡记录
- 打卡项
- 自定义打卡项
- 学习记录
- 每日总结
- 体重
- 历史记录

## 扩展预留

- 微信登录：新增 `users` 表，记录 `openid/unionid`，所有业务表增加 `user_id`。
- 多设备同步：所有 API 按用户维度查询。
- 图片上传：使用腾讯云 COS，后端签发临时上传凭证。
- AI 智能分析：在 `services/summaryService.js` 扩展 Provider 和分析任务。
- 数据导出：后端读取数据库生成 CSV/JSON，文件可存 COS。
- 数据备份恢复：SQLite 文件定时备份到 COS；MySQL 阶段使用 TencentDB 自动备份。
- 消息提醒：使用微信订阅消息，后端保存提醒配置。
- 番茄钟：新增 session 表，不影响打卡记录模型。
- 更多图表：统计接口增加聚合字段，前端逐步升级展示。
