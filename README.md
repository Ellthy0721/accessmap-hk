# Mapable HK

<p align="center"><img src="assets/logoEN.png" alt="Mapable HK" width="360"></p>
<p align="center"><strong>面向香港长者、残障人士、照顾者及一般乘客的无障碍优先多模式路线规划器</strong></p>
<p align="center"><a href="https://ellthy0721.github.io/Mapable-HK/">在线版本</a> · <a href="reference.md">数据与参考来源</a></p>

## 项目简介

Mapable HK 是一个在浏览器中运行的香港路线规划应用。它把步行、巴士、港铁、轻铁及不同公共交通之间的换乘组合在同一个路线结果中，并根据乘客的出行需要调整步行、楼梯、斜坡、过路处、转乘、候车、票价和资料不确定性的成本。

项目重点不是只找理论上最快的路线，而是把真实出行中会影响长者、轮椅使用者、视障人士、色觉差异人士及照顾者的条件呈现在路线比较、地图和步骤说明中。

Mapable HK 是纯静态前端应用，没有项目自有后端或账号系统。已发布版本可直接由 GitHub Pages 提供。

> 重要：本项目不是政府、公共交通营办商、医疗机构或紧急服务的官方产品。路线、无障碍设施、班次、车费及设施状态均可能变化，出发前应向相关机构核实。

## English summary

Mapable HK is an accessibility-first, browser-based journey planner for Hong Kong. It combines walking, bus, MTR, Light Rail and mixed-mode transfers, then ranks route candidates using travel time, walking effort, transfers, fare, accessibility risks and data confidence.

The interface supports Traditional Chinese, Simplified Chinese and English, with independent colour-vision and high-contrast display modes. The published application is a static GitHub Pages site with no project-operated backend.

## 主要功能

### 多模式路线规划

- 支持步行、九巴、龙运巴士、城巴、新大屿山巴士、港铁巴士、港铁及轻铁。
- 支持任意公共交通工具之间的混合换乘，不按交通模式设置固定名次。
- 以时间、步行距离、转乘、候车暴露、票价、无障碍风险和资料可信度形成综合成本。
- 支持“立即出发”、“计划时间”和“全部路线”三种出发模式。
- 在可用时读取即时到站资料；失败时明确显示计划班次或估算状态。
- 可展开公共交通路段查看沿途站点，并在地图聚焦所选路段。
- 地图聚焦会避开桌面及手机菜单遮挡区域。

### Profile 出行需要

| Profile | 路线侧重点 | 视觉默认值 |
| --- | --- | --- |
| 长者 | 减少楼梯、陡坡、长距离连续步行、复杂转乘和长时间候车 | 标准对比度 |
| 轮椅 | 已知楼梯为硬性限制；提高斜坡、升降机、入口连接和通道资料的重要性 | 标准对比度 |
| 视障 | 提高复杂过路处、资料不完整路段和频繁转乘的成本 | 默认开启高对比显示 |
| 色弱 | 路线排序沿用一般模式；可选择红绿色觉或蓝黄色觉显示 | 独立色觉模式 |
| 婴儿车／照顾者 | 强烈避开楼梯，重视斜道、升降机、连续步行和转乘负担 | 显示母婴设施控制 |
| 一般 | 以时间、步行、转乘和票价的通用权重比较路线 | 标准显示 |

Profile 通过约束和成本权重影响路线，而不是为某条具体路线设置特判。缺失关键无障碍资料时，界面会显示待核实状态，不会把未知情况自动当作可通行。

### 视觉与操作无障碍

- `colorMode` 与 `contrastMode` 相互独立。
- 色觉模式包括红绿色觉和蓝黄色觉配色，不使用全页滤镜模拟色觉缺陷。
- 高对比模式使用清晰边框、白色或近黑背景、黄色焦点和选中提示。
- 路线同时使用图标、文字、描边、标签及必要的线型，颜色不是唯一编码。
- 支持键盘焦点、可访问名称、窄屏重排和高倍缩放。
- 使用 Noto Sans HK、Noto Sans TC、Noto Sans SC 和 Noto Sans 字体回退。
- 手机端和桌面端使用不同的可折叠菜单及路线聚焦布局。

### 地图、地点与设施

- 支持本地地点索引、远端地理编码补充、地图点选和浏览器定位。
- 开屏定位提示同时显示中文和英文，避免用户在定位前无法切换语言。
- 港铁路线可显示建议出站口、出口编号和出口地图标点。
- 港铁出口资料覆盖 98 个车站；无可靠资料时不会虚构出口编号。
- 提供母婴设施、公共厕所和 AED 地图图层，三个设施图层互斥显示。
- 母婴设施图层只在“婴儿车／照顾者” Profile 中出现。
- 设施资料卡可把设施设为目的地并立即规划路线。
- 地图缩小时会分级隐藏出口及路线标签，减少标记重叠。

### 路线步骤与资料透明度

- 路线摘要显示步行、预计时间和票价。
- 每段路线显示交通模式、路线编号、方向、候车、车程和下车位置。
- 步行路段显示距离、时间及已知楼梯、斜坡、斜道、升降机、行人天桥和过路信息。
- 对入口连接、路面、通道宽度、路缘、坡度及过路辅助资料缺失作明确提示。
- 区分官方连续线形、开放数据 route shape、道路约束补线和保守估算。
- 资料源明确标示没有营运窗口的路线不会作为正常服务推荐。

## 使用流程

1. 选择最符合乘客需要的 Profile。
2. 输入起点和终点，使用当前位置，或在地图点选位置。
3. 选择立即出发、计划时间或全部路线。
4. 比较路线时间、步行、票价、风险和资料提示。
5. 点选路线选项或某段路线，在地图查看实际走向。
6. 展开公共交通路段查看沿途站点。
7. 按需要查看港铁出口、母婴设施、公共厕所或 AED。

## 路线规划流程

```mermaid
flowchart LR
  A["起点、终点、Profile、出发时间"] --> B["本地搜索、定位或地图点选"]
  B --> C["步行与公共交通候选生成"]
  C --> D["班次、ETA、票价及服务日历"]
  D --> E["Profile 约束与综合成本评分"]
  E --> F["路线选项、步骤、风险及资料来源"]
  F --> G["地图线形、站点、出口及设施"]
```

路线规划主要在浏览器端完成。较重的路线计算通过 Web Worker 运行，静态资料按用途及路线分桶加载，以减少主界面阻塞和首次下载量。

## 主要数据来源

| 数据类别 | 主要来源 | 用途 |
| --- | --- | --- |
| 地图底图与标注 | [香港地图服务](https://api.hkmapservice.gov.hk/) | Leaflet 底图及繁体、简体、英文地图标注 |
| 公共交通路线、站点及车费 | [运输署 DATA.GOV.HK](https://data.gov.hk/en-data/dataset/hk-td-tis_23-routes-fares-geojson) | 巴士站序、路线、方向、全程车费和行车时间 |
| 城巴连续线形 | [CSDI FB_ROUTE_LINE](https://portal.csdi.gov.hk/server/rest/services/common/td_rcd_1638844988873_41214/MapServer/0?f=pjson) | 城巴及联营路线官方道路走向 |
| 九巴及龙运 | [KMB/LWB Open Data](https://data.etabus.gov.hk/) | 路线、站点和即时到站 |
| 城巴即时到站 | [Citybus API](https://rt.data.gov.hk/v2/transport/citybus/) | 城巴路线、站序和 ETA |
| 新大屿山巴士 | [NLB API](https://rt.data.gov.hk/v2/transport/nlb/) | 屿巴路线、站点、车费和 ETA |
| 港铁及轻铁 | [MTR Open Data](https://data.gov.hk/en-data/dataset/mtr-data-routes-fares-barrier-free-facilities) | 站点、路线、票价、班次及部分无障碍资料 |
| 港铁出口 | CSDI 3D Indoor MTR Station Map、GeoInfo Map | 出口编号、出口组、坐标和尾段步行连接 |
| 步行路网 | CSDI 3D Pedestrian Network | 步行寻路及楼梯、斜坡、过路处等属性 |
| 路线补充线形 | Hong Kong Community GTFS、OpenStreetMap、HOTOSM | 缺失方向、铁路及轻铁线形补充 |
| 母婴设施 | 卫生署家庭健康服务、港铁、UNICEF HK 公开资料 | 母婴室和母婴友善场所 |
| 公共厕所 | 食环署、渔护署开放资料 | 公共厕所位置及场所信息 |
| AED | 消防处 CARE AED 开放资料 | AED 位置及相关场所信息 |

完整数据链接、构建方式、覆盖范围、许可和限制见 [`reference.md`](reference.md)。

## 技术结构

- 原生 HTML、CSS 和 JavaScript。
- [Leaflet](https://leafletjs.com/) 负责地图、标记和路线图层。
- Leaflet.markercluster 负责设施标点聚合。
- Air Datepicker 负责计划日期和时间选择。
- Web Worker 负责路线规划任务隔离和取消。
- 本地静态 JSON 负责地点、交通、票价、出口、设施和步行资料。
- GitHub Pages 负责静态部署。

## 仓库结构

`main` 分支只保存最终可部署版本，开发过程文件、原始下载及本地构建资料不发布到 GitHub。

```text
.
├── index.html                 # 应用入口
├── styles/main.css           # 响应式界面和视觉模式
├── scripts/main.js           # UI、地图、定位和交互
├── scripts/services/         # 搜索、Profile、设施和路线服务
├── route-worker.js           # 路线规划 Web Worker
├── data/                     # 发布用静态数据
├── assets/                   # 品牌、图标和光标资源
├── reference.md              # 数据、外部资料和许可记录
├── .nojekyll                 # GitHub Pages 静态文件设置
└── README.md
```

## 本地运行

项目使用 `fetch()` 读取本地 JSON，请不要直接用 `file://` 打开 `index.html`。在仓库根目录运行：

```powershell
python -m http.server 8093
```

然后打开 `http://127.0.0.1:8093/`。无需安装 npm 依赖或执行前端打包。浏览器定位通常只允许在 HTTPS 或 `localhost` / `127.0.0.1` 安全上下文使用。

## 部署

仓库根目录就是 GitHub Pages 发布内容。推送到 `main` 后，发布地址为：

```text
https://ellthy0721.github.io/Mapable-HK/
```

发布时应确保 `index.html` 引用的版本化脚本、样式、数据和资源同时更新。

## 隐私

- 不需要注册、登录或建立账号。
- 项目没有自有服务器接收或保存路线请求。
- 浏览器定位只在当前页面内用于显示位置、设置起点和路线计算，应用不会主动持久化定位结果。
- 语言选择会保存到浏览器 `localStorage`，键名为 `mapable-language`。
- 地图图块、远端地点搜索和即时到站功能会直接请求相应第三方开放服务。
- 用户输入的地点查询可能发送到 ArcGIS、Nominatim 或 Photon 等地理编码服务作为本地搜索补充。

## 无障碍与安全限制

- Profile 只能根据已收录资料调整路线，不能证明整段路线实际无障碍。
- 升降机、斜道、出口、厕所、母婴室和 AED 的开放及可用状态可能临时变化。
- “附近有设施标记”不等于路线一定经过或能够使用该设施。
- 入口连接、路面、通道宽度、路缘、坡度和过路辅助资料可能不完整。
- 即时到站失败时，路线可能使用计划班次或估算候车时间。
- 票价会受分段收费、转乘优惠、付款方式、日期和营办商政策影响。
- AED 图层只提供位置参考。发生紧急情况时，应立即致电香港紧急服务 `999`。

## 浏览器支持

建议使用近期版本的 Chrome、Edge、Firefox 或 Safari。应用依赖 Web Worker、Fetch API、Geolocation API、CSS Grid、Flexbox、媒体查询及 CSS 自定义属性。禁用 JavaScript、阻止第三方地图资源或限制定位权限时，部分功能不可用。

## 问题报告

报告问题时，请提供起点、终点、Profile、出发模式、路线编号和方向、浏览器、设备、屏幕尺寸、截图、实际结果及期望结果。数据错误请同时提供官方链接或现场资料，并说明发生日期。

不要在公开 Issue 中提交精确住址、实时位置或其他个人资料。

## 许可与归属

本仓库目前未附加统一的代码许可证。除非另有明确说明，仓库内容不自动授予再使用许可。

地图、交通、设施、字体、第三方程序库及开放数据分别受其提供者的条款、版权或开放数据许可约束。OpenStreetMap 衍生资料须遵守 ODbL 和 attribution 要求。详细归属见 [`reference.md`](reference.md) 及应用“设置”中的路线资料说明。

## 致谢

感谢香港特别行政区政府各开放数据提供部门、运输署、地政总署、港铁、九巴、龙运巴士、城巴、新大屿山巴士、消防处、食环署、渔护署、卫生署家庭健康服务，以及 OpenStreetMap、HOTOSM、Hong Kong Community GTFS、Leaflet 和相关开放数据社区。

---

**Mapable HK provides route guidance with explicit uncertainty. Always verify critical accessibility and service information before travelling.**
