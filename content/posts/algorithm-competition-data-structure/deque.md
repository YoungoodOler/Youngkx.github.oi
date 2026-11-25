---
title: "双端队列（Deque）"
excerpt: "双端队列的首尾操作、随机访问，以及单调队列和 0-1 BFS 的用途。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

双端队列（Deque）允许从首尾两端加入和删除元素。C++ 的 `deque` 也支持下标访问。典型实现使用多个内存块保存元素，因此能高效扩展两端。

## 2. 结构与工作原理

### 2.1 两端操作

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 99" role="img" aria-label="双端队列两端均可插入和删除" fill="currentColor">
    <rect x="115" y="32" width="70" height="40" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="150" y="53" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">A</text>
    <rect x="185" y="32" width="70" height="40" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="220" y="53" text-anchor="middle" dominant-baseline="middle" font-size="14">B</text>
    <rect x="255" y="32" width="70" height="40" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="290" y="53" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">C</text>
    <path d="M61 43 L109 43" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M103.0 39.0 L109 43 L103.0 47.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M109 61 L61 61" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M67.0 65.0 L61 61 L67.0 57.0" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M379 43 L331 43" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M337.0 47.0 L331 43 L337.0 39.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M331 61 L379 61" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M373.0 57.0 L379 61 L373.0 65.0" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <text x="85" y="22" text-anchor="middle" dominant-baseline="middle" font-size="13">队首</text>
    <text x="355" y="22" text-anchor="middle" dominant-baseline="middle" font-size="13">队尾</text>
  </svg>
  <figcaption>首尾两端各有入队与出队操作。</figcaption>
</figure>

初始为 `[20,30]`，队首添加 `10` 后是 `[10,20,30]`，队尾添加 `40` 后是 `[10,20,30,40]`。从任一端删除，只改变这一端的边界。

### 2.2 单调队列

要求每个长度为 `k` 的窗口的最大值时，可以让队列里的下标从前到后递增，值从前到后递减。先在队首移除小于窗口左端点的下标。再从队尾移除值不大于当前新值的候选，因为新值比它们更晚离开窗口。把当前下标加入队尾后，队首就是有效候选中的最大值。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 133" role="img" aria-label="滑动窗口前移时双端队列的两类淘汰" fill="currentColor">
    <text x="14" y="26" text-anchor="start" dominant-baseline="middle" font-size="13">旧窗口候选</text>
    <rect x="136" y="12" width="60" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="166" y="26.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">5</text>
    <rect x="196" y="12" width="60" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="226" y="26.5" text-anchor="middle" dominant-baseline="middle" font-size="14">3</text>
    <rect x="256" y="12" width="60" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="286" y="26.5" text-anchor="middle" dominant-baseline="middle" font-size="14">2</text>
    <text x="14" y="65" text-anchor="start" dominant-baseline="middle" font-size="13">队首过期</text>
    <rect x="136" y="51" width="60" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="166" y="65.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">3</text>
    <rect x="196" y="51" width="60" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="226" y="65.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">2</text>
    <text x="14" y="104" text-anchor="start" dominant-baseline="middle" font-size="13">从队尾淘汰后</text>
    <rect x="136" y="90" width="60" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="166" y="104.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">6</text>
    <text x="347" y="25" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">移出值 5</text>
    <text x="347" y="64" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">新值 6 到来</text>
    <text x="347" y="103" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">最大值为 6</text>
  </svg>
  <figcaption>旧窗口为 [5, 3, 2]，新窗口为 [3, 2, 6]。5 从队首过期，2 和 3 从队尾被新值淘汰。</figcaption>
</figure>

若最大值相同时要保留最早出现的那个位置，移除队尾时应使用严格小于。这样相同值会按进入顺序保留。

### 2.3 0-1 BFS

边权为 0 的松弛如果成功，得到的距离与当前点相同，把候选放到队首。边权为 1 时，新距离多 1，把候选放到队尾。一个点可能再次获得更短距离，所以判断入队的条件是距离确实减小。

## 3. 基本操作及时间复杂度

| 操作 | 时间复杂度 |
| --- | --- |
| 两端插入、删除 | $O(1)$ |
| 读取首尾或下标访问 | $O(1)$ |
| 中间插入、删除 | 最坏 $O(n)$ |
| 遍历、无序查找 | $O(n)$ |

普通 `deque` 存 `n` 个元素需要 $O(n)$ 空间。单调队列中的每个下标至多入队和出队各一次，算法共 $O(n)$，队列大小最多为窗口长度。

<aside class="ds-note" aria-label="窗口左端点">
  <p><strong>窗口左端点。</strong>当前窗口为 <code>[i-k+1,i]</code>。下标等于 <code>i-k</code> 已经在窗口外，应从队首移除。</p>
</aside>

## 4. C++ 代码实现

下面用 `deque<int>` 存候选下标，计算 `[5,3,2,6,4]` 中每个长度为 3 的窗口最大值。下标 `i-k` 已经越过当前窗口的左侧，可以淘汰。

```cpp
#include <deque>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> a = {5, 3, 2, 6, 4};
    int k = 3;
    deque<int> q;

    for (int i = 0; i < int(a.size()); ++i) {
        while (!q.empty() && q.front() <= i - k) q.pop_front();
        while (!q.empty() && a[q.back()] <= a[i]) q.pop_back();
        q.push_back(i);

        if (i >= k - 1) cout << a[q.front()] << ' ';
    }
    cout << '\n';
}
```

运行结果

```text
5 6 6
```

## 5. STL 中的对应容器

| `deque<T>` 接口 | 作用 |
| --- | --- |
| `push_front(x)`、`push_back(x)` | 从首尾加入 |
| `pop_front()`、`pop_back()` | 从首尾删除 |
| `front()`、`back()` | 读取首尾元素 |
| `d[i]` | 按下标访问 |
| `empty()`、`size()` | 判空、取长度 |

头文件是 `<deque>`。两端插入后，原有元素的引用仍有效，迭代器会失效。除非熟悉具体的失效规则，做滑动窗口时直接存下标更清楚。

```cpp
#include <deque>
#include <iostream>
using namespace std;

int main() {
    deque<int> d = {20, 30};
    d.push_front(10);
    d.push_back(40);

    cout << d.front() << ' ' << d.back() << '\n';

    d.pop_front();
    d.pop_back();
    cout << d[0] << ' ' << d[1] << '\n';
}
```

运行结果

```text
10 40
20 30
```

## 6. 典型应用场景

### 6.1 典型用法

处理两端调度、滑动窗口最值和 0-1 BFS。求窗口最小值时，反转淘汰队尾的比较方向。窗口外的下标依旧从队首排出。

### 6.2 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 P1886 滑动窗口](https://www.luogu.com.cn/problem/P1886) | 分别维护递增、递减的候选队列 |

## 7. 优点与局限性

`deque` 同时支持两端修改和常数时间下标访问。若只从尾部追加且经常连续扫描，`vector` 的连续布局通常更合适。单调队列依赖窗口边界从左到右移动。需要删除任意位置的元素时，可改用 `multiset` 等有序容器。
