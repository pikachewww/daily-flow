# 接口文档

默认地址：

```text
http://localhost:3001/api
```

## 数据模型

```json
{
  "date": "2026-06-29",
  "tasks": {
    "learning": true,
    "breakfast": true,
    "lunch": false,
    "dinner": false,
    "water": false,
    "exercise": false,
    "sleep_early": false
  },
  "aiTopic": "React 状态管理",
  "aiMinutes": 30,
  "dailyGain": "完成了 MVP",
  "weight": 60.5,
  "aiSummary": "今天完成不错，继续保持。"
}
```

## GET /checkin/today

获取今天的打卡记录。没有记录时会自动创建空记录。

## GET /checkin/:date

获取指定日期的完整打卡记录，用于日历点击查看详情。

## POST /checkin

保存或更新某天的打卡记录。

请求体：

```json
{
  "date": "2026-06-29",
  "tasks": {
    "learning": true,
    "breakfast": true
  },
  "aiTopic": "Prompt 工程",
  "aiMinutes": 30,
  "dailyGain": "学会了结构化提示词",
  "weight": 60.5,
  "aiSummary": ""
}
```

## GET /checkin/history

获取历史记录，默认最多返回 90 天。

可选参数：

```text
limit=30
```

## GET /stats

获取统计数据：

- 连续打卡天数
- 最近 7 天平均完成率
- 最近 7 天每日完成率
- 学习完成次数：`learningCompletedCount`
- 体重变化
- 最近 7 天体重趋势：`weightTrend7`
- 最近 30 天体重趋势：`weightTrend30`

## GET /items

获取所有未删除的打卡项，按排序返回。

## POST /items

新增自定义打卡项。

```json
{
  "name": "阅读",
  "enabled": true,
  "isDefault": true,
  "sortOrder": 100
}
```

## PATCH /items/:id

编辑打卡项名称、启用状态、默认显示状态或排序。

```json
{
  "name": "背单词",
  "enabled": true,
  "isDefault": true,
  "sortOrder": 80
}
```

## DELETE /items/:id

删除打卡项。删除后不再出现在管理列表和今日打卡页，历史记录保留。

## POST /summary

为指定日期生成一句 30 字以内的总结。

请求体：

```json
{
  "date": "2026-06-29"
}
```

如果配置了 AI Provider API Key，会调用远程模型；否则自动使用本地规则生成。

## GET /health

后端健康检查接口。
