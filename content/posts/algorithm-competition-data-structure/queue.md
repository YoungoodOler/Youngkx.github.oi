---
title: "队列（Queue）"
excerpt: "队列的先进先出、STL 接口，以及它为什么适合 BFS。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

队列（Queue）是一种先进先出（FIFO）的线性结构。新元素从**队尾**进入，最早加入的元素从**队首**移除。队列能自然表示任务等待的先后顺序。

## 2. 结构与工作原理

### 2.1 入队和出队

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

队列为 `[A,B,C]` 时，先出队得到 A，再入队 D，结果为 `[B,C,D]`。队首和队尾的值可以直接读取，读取本身不会移除元素。

### 2.2 队列怎样实现分层搜索？

无权图的 BFS 先把起点以距离 0 入队。每次从队首取出一个结点，把尚未发现的邻居记为当前距离加 1，再加入队尾。由于下一层总接在已有结点之后，较近的结点先处理。第一次发现一个点时就标记为已访问，避免两个前驱将它都加入队列。

### 2.3 多源 BFS

可以同时把多个起点以距离 0 入队。例如要算每格到最近出口的步数，从所有出口一起向外扩张即可。对于可以双向走的网格，这与从每格找最近出口的距离相同。

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

## 3. 基本操作及时间复杂度

| 操作 | 常见复杂度 | 条件 |
| --- | --- | --- |
| 队尾入队 | $O(1)$ | `queue` 默认底层容器 |
| 队首出队 | $O(1)$ | 队列非空 |
| 读队首、队尾 | $O(1)$ | 队列非空 |
| 判空、取长度 | $O(1)$ | 随时可用 |
| 查找某个值 | 最坏 $O(n)$ | 直接访问接口不提供搜索 |

存储 `n` 个元素需要 $O(n)$ 空间。用邻接表做 BFS 时，每个点最多入队一次，每条边只检查常数次，耗时 $O(V+E)$。

<aside class="ds-note" aria-label="标记时机">
  <p><strong>标记时机。</strong>节点第一次入队时就写入距离。等到它出队才标记，同一层的多个节点可能反复把它加入队列。</p>
</aside>

## 4. C++ 代码实现

下面用 `queue` 对一个含五个点的无向图做 BFS。编号 4 的点不与其他点相连，距离保留为 `-1`。`dist` 同时记录距离和是否已经入过队。

```cpp
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

int main() {
    vector<vector<int>> adj = {{1, 2}, {0, 3}, {0, 3}, {1, 2}, {}};
    vector<int> dist(adj.size(), -1);
    queue<int> q;
    dist[0] = 0;
    q.push(0);

    while (!q.empty()) {
        int u = q.front();
        q.pop();
        for (int v : adj[u]) {
            if (dist[v] != -1) continue;
            dist[v] = dist[u] + 1;
            q.push(v);
        }
    }

    for (int x : dist) cout << x << ' ';
    cout << '\n';
}
```

运行结果

```text
0 1 1 2 -1
```

## 5. STL 中的对应容器

| `queue<T>` 接口 | 作用 |
| --- | --- |
| `push(x)`、`emplace(...)` | 从队尾加入 |
| `front()`、`back()` | 查看首尾 |
| `pop()` | 删除队首 |
| `empty()`、`size()` | 判空、取长度 |

头文件是 `<queue>`。要在出队后继续使用旧队首，应先复制元素。把 `front()` 存成引用后出队会让那个引用失效。

```cpp
#include <iostream>
#include <queue>
using namespace std;

int main() {
    queue<int> q;
    q.push(10);
    q.push(20);

    cout << q.front() << ' ' << q.back() << '\n';
    q.pop();
    cout << q.front() << '\n';
}
```

运行结果

```text
10 20
20
```

## 6. 典型应用场景

### 6.1 典型用法

- 无权图和网格最短路、多个起点同时扩张。
- 层序遍历。要分层输出时，在每层开始先记下当前队列长度。
- 拓扑排序。把入度刚降至 0 的点放入队尾；若最终处理的点数不足，图中存在环。

### 6.2 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 P1443 马的遍历](https://www.luogu.com.cn/problem/P1443) | 把马的八种移动当作邻接关系，做无权图最短路 |

## 7. 优点与局限性

队列适合保持到达顺序，或按层推进状态。普通 BFS 要求每一步代价相同。边权只含 0 和 1 时可用双端队列，其他非负边权通常用优先队列配合 Dijkstra。
