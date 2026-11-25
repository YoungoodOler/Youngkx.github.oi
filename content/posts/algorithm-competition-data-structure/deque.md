---
title: "双端队列（Deque）"
excerpt: "讲解两端操作、滑动窗口最大值的单调队列与 0-1 BFS。"
---

[← 返回数据结构总览](../)

## 1. 双端队列能做什么？

队列的进出方向固定，双端队列允许在首尾任意一端插入和删除。C++ 的 `std::deque` 还能按下标随机访问。它的元素可以分块存储，不能像连续数组一样通过一个元素的地址加偏移来遍历。

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

## 2. 基本操作与 STL

| 操作 | `std::deque` 接口 | 时间复杂度 |
| --- | --- | --- |
| 两端加入 | `push_front(x)`、`push_back(x)` | $O(1)$ |
| 两端删除 | `pop_front()`、`pop_back()` | $O(1)$ |
| 两端取值、按下标访问 | `front()`、`back()`、`d[i]` | $O(1)$ |
| 中间插入或删除 | `insert(it, x)`、`erase(it)` | 最坏 $O(n)$ |

头文件是 `<deque>`。两端插入后，原有元素的引用仍有效，旧的迭代器可能失效。滑动窗口里通常直接存下标，每次从队首或队尾取当前下标。

## 3. 操作示例：每个长度为 k 的窗口的最大值

从左向右扫描。队列存的是**可能成为窗口最大值的下标**，满足下标从前到后递增、对应值从前到后严格递减。

1. 左端点移到 `i - k + 1`。从队首删掉所有小于左端点的下标。
2. 如果队尾对应的值不大于新值 `a[i]`，删掉队尾。新值至少一样大，而且更晚离开后续的窗口。
3. 把 `i` 放到队尾。窗口凑满后，队首对应的值就是最大值。

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

| 数组 `[4, 2, 5, 3, 1]`，`k = 3` | 当前窗口 | 保留的候选值 | 答案 |
| --- | --- | --- | --- |
| 扫到 5 | `[4, 2, 5]` | `[5]` | 5 |
| 扫到 3 | `[2, 5, 3]` | `[5, 3]` | 5 |
| 扫到 1 | `[5, 3, 1]` | `[5, 3, 1]` | 5 |

```cpp
#include <deque>
#include <vector>

std::vector<int> sliding_max(const std::vector<int>& a, int k) {
    int n = static_cast<int>(a.size());
    if (k <= 0 || k > n) return {};

    std::vector<int> result;
    std::deque<int> candidates;
    for (int i = 0; i < n; ++i) {
        while (!candidates.empty() && candidates.front() <= i - k) {
            candidates.pop_front();
        }
        while (!candidates.empty() && a[candidates.back()] <= a[i]) {
            candidates.pop_back();
        }
        candidates.push_back(i);
        if (i >= k - 1) result.push_back(a[candidates.front()]);
    }
    return result;
}
```

每个下标入队一次，最多从其中一端出队一次。时间为 $O(n)$，候选队列的空间为 $O(k)$。如果要求最大值相同时返回最早的下标，队尾比较应改为严格小于，并输出队首下标。

## 4. 另一种用法：0-1 BFS

在边权只有 0 和 1 的图中，取出当前最短的候选顶点。通过权为 0 的边成功松弛得到的距离仍是 $d$，放到队首；通过权为 1 的边成功松弛得到的是 $d+1$，放到队尾。可随顶点保存入队时的距离，弹出后跳过已经过期的条目。

与普通 BFS 相比，0-1 BFS 中顶点的距离可能在第一次被发现后继续变小，所以判断是否入队的条件是**新距离更短**。

## 5. 变式和边界

- 求滑动窗口最小值时，把队尾淘汰条件改为队尾值大于等于当前值。
- 下标刚好等于当前左端点时仍在窗口内。写成 `front() <= i-k` 或 `front() < i-k+1` 都正确。
- 若离开窗口的顺序并不跟进入顺序一致，例如要删除任意一个键，单调队列的队首失效逻辑就不再适用，可以改用有序容器。
- 0-1 BFS 用的双端队列按距离组织待处理顶点。它与滑动窗口里按元素值维护候选的单调队列是两种算法，入队规则分别由边权和支配关系决定。
