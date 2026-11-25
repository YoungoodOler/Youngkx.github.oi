---
title: "队列（Queue）"
excerpt: "讲解先进先出、STL 队列与 BFS 的分层性质，并实现多源网格 BFS。"
---

[← 返回数据结构总览](../)

## 1. 先进先出和搜索层次

队列把新元素放到队尾，从队首取出最早加入的元素。BFS 用它控制处理顺序。若边权都为 1，从起点开始，先处理距离为 0 的顶点，然后处理距离为 1、2、3 的顶点。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 93" role="img" aria-label="队列的入队和出队方向" fill="currentColor">
    <rect x="115" y="31" width="70" height="34" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="150" y="49" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">A</text>
    <rect x="185" y="31" width="70" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="220" y="49" text-anchor="middle" dominant-baseline="middle" font-size="14">B</text>
    <rect x="255" y="31" width="70" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="290" y="49" text-anchor="middle" dominant-baseline="middle" font-size="14">C</text>
    <path d="M110 48 L56 48" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M62.0 52.0 L56 48 L62.0 44.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M384 48 L330 48" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M336.0 52.0 L330 48 L336.0 44.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <text x="83" y="29" text-anchor="middle" dominant-baseline="middle" font-size="13">出队</text>
    <text x="357" y="29" text-anchor="middle" dominant-baseline="middle" font-size="13">入队</text>
    <text x="150" y="78" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">队首</text>
    <text x="290" y="78" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">队尾</text>
  </svg>
  <figcaption>A 最早进入，先从队首离开。</figcaption>
</figure>

设起点 A 连着 B、C，B 和 C 又都连着 D。处理 A 后，B、C 依次入队。处理 B 时第一次发现 D，就记下距离 2 并将 D 入队。处理 C 时看到 D 已经有距离，就跳过它。**在入队时标记**，能让每个顶点只进队一次。

## 2. 基本操作与 STL

| 操作 | `std::queue` 接口 | 默认底层容器下的时间复杂度 |
| --- | --- | --- |
| 从队尾加入 | `push(x)` | $O(1)$ |
| 从队首删除 | `pop()` | $O(1)$ |
| 读队首或队尾 | `front()`、`back()` | $O(1)$ |
| 判空或查询长度 | `empty()`、`size()` | $O(1)$ |

头文件为 `<queue>`。在 `pop()` 之前先复制队首的值。若把 `front()` 存成引用，再删除该元素，引用就失效。

## 3. 操作示例：离最近出口的步数

每步可走到上下左右的相邻格，`#` 是墙，`S` 是出口。要求每个格子到最近出口的距离。先把所有出口以距离 0 入队，然后做一次 BFS。因为这里的格子边可以双向走，从出口向外走的距离等于其他格子走到出口的距离。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 138" role="img" aria-label="双起点网格的最短距离分层" fill="currentColor">
    <rect x="150" y="9" width="46" height="39" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="173" y="29.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">0</text>
    <rect x="196" y="9" width="46" height="39" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="219" y="29.5" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <rect x="242" y="9" width="46" height="39" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="265" y="29.5" text-anchor="middle" dominant-baseline="middle" font-size="14">2</text>
    <rect x="150" y="48" width="46" height="39" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="173" y="68.5" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <rect x="196" y="48" width="46" height="39" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="219" y="68.5" text-anchor="middle" dominant-baseline="middle" font-size="14">墙</text>
    <rect x="242" y="48" width="46" height="39" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="265" y="68.5" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <rect x="150" y="87" width="46" height="39" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="173" y="107.5" text-anchor="middle" dominant-baseline="middle" font-size="14">2</text>
    <rect x="196" y="87" width="46" height="39" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="219" y="107.5" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <rect x="242" y="87" width="46" height="39" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="265" y="107.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">0</text>
    <text x="93" y="28" text-anchor="middle" dominant-baseline="middle" font-size="13">出口</text>
    <path d="M116 28 L145 28" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M139 24 L145 28 L139 32" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-width="1.6"/>
    <text x="338" y="106" text-anchor="middle" dominant-baseline="middle" font-size="13">出口</text>
    <path d="M315 106 L291 106" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M297 102 L291 106 L297 110" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-width="1.6"/>
  </svg>
  <figcaption>两个出口同时作为第 0 层。墙保持不可达，其余格子得到到最近出口的步数。</figcaption>
</figure>

```cpp
#include <queue>
#include <string>
#include <utility>
#include <vector>

std::vector<std::vector<int>> distance_to_exit(const std::vector<std::string>& grid) {
    if (grid.empty()) return {};
    int rows = static_cast<int>(grid.size());
    int cols = static_cast<int>(grid[0].size());
    std::vector<std::vector<int>> dist(rows, std::vector<int>(cols, -1));
    std::queue<std::pair<int, int>> q;

    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            if (grid[r][c] == 'S') {
                dist[r][c] = 0;
                q.emplace(r, c);
            }
        }
    }

    constexpr int dr[] = {-1, 1, 0, 0};
    constexpr int dc[] = {0, 0, -1, 1};
    while (!q.empty()) {
        auto [r, c] = q.front();
        q.pop();
        for (int i = 0; i < 4; ++i) {
            int nr = r + dr[i], nc = c + dc[i];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (grid[nr][nc] == '#' || dist[nr][nc] != -1) continue;
            dist[nr][nc] = dist[r][c] + 1;
            q.emplace(nr, nc);
        }
    }
    return dist;
}
```

矩形网格有 $R\times C$ 个格子，时间和空间均为 $O(RC)$。墙和无法到达出口的格子保留为 `-1`。若题目只问第一个目标，首次发现它时可以结束并返回距离。

## 4. 典型应用和边界

- 普通 BFS 求无权图最短路。用邻接表时，时间为 $O(V+E)$。
- 树的层序遍历。需要分层输出时，进入一层前先记下当前的 `q.size()`，只处理这么多个元素。
- 拓扑排序。把入度刚降到 0 的点加入队尾，最后比较处理数和顶点总数，能发现环。
- 边权为 0 或 1 时可以用双端队列。存在其他非负权值时，通常用二叉堆优化 Dijkstra。

## 5. 记录路径、管理容量

若还要输出路径，在首次发现 `v` 时保存 `parent[v] = u`。从目标沿父节点返回，再反转顺序。多源 BFS 的父链最终停在某个距离为 0 的起点。如果有多个同距离方案，得到哪条路径取决于初始入队与邻接点访问顺序。

固定容量的环形缓冲区用一个数组和首尾下标。每次移动下标时到达末尾就绕回 0。可以额外记录已有元素数来区分空与满，因为两种情况下首尾下标都可能相等。普通竞赛 BFS 用 STL 队列即可，需要重用预分配存储或固定容量时再考虑环形缓冲区。
