---
title: "哈希表（Hash Table）"
excerpt: "从分桶和冲突出发，讲解无序关联容器，并用前缀和计数求子数组。"
---

[← 返回数据结构总览](../)

## 1. 哈希值如何帮我们查找？

哈希函数把键转换为一个哈希值，容器据此定位桶。多个键可能落在同一桶，例如 `5 mod 4` 和 `9 mod 4` 都等于 1。这样的冲突由哈希表处理，判断键是否相等仍需要比较实际的键。图中用链地址法表示同桶元素。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 136" role="img" aria-label="键 5 与 9 的哈希冲突" fill="currentColor">
    <rect x="96" y="7" width="54" height="25" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="123" y="20.5" text-anchor="middle" dominant-baseline="middle" font-size="14">桶 0</text>
    <rect x="96" y="38" width="54" height="25" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="123" y="51.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">桶 1</text>
    <rect x="96" y="69" width="54" height="25" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="123" y="82.5" text-anchor="middle" dominant-baseline="middle" font-size="14">桶 2</text>
    <rect x="96" y="100" width="54" height="25" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="123" y="113.5" text-anchor="middle" dominant-baseline="middle" font-size="14">桶 3</text>
    <text x="191" y="20" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">空</text>
    <text x="191" y="113" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">空</text>
    <rect x="208" y="38" width="49" height="25" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="232.5" y="51.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">5</text>
    <rect x="288" y="38" width="49" height="25" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="312.5" y="51.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">9</text>
    <rect x="208" y="69" width="49" height="25" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="232.5" y="82.5" text-anchor="middle" dominant-baseline="middle" font-size="14">6</text>
    <path d="M153 50 L203 50" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M197.0 46.0 L203 50 L197.0 54.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M260 50 L283 50" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M277.0 46.0 L283 50 L277.0 54.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M153 81 L203 81" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M197.0 77.0 L203 81 L197.0 85.0" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
  </svg>
  <figcaption>用 h(x) = x mod 4 分桶时，5 和 9 都进入桶 1。</figcaption>
</figure>

元素逐渐变多时，容器可以增加桶数并重新分桶。负载因子是元素数除以桶数。若提前知道大概要插入多少不同的键，可以用 `reserve(n)` 减少中途重新分桶的次数。

## 2. 基本操作与复杂度

| 操作 | 平均 | 最坏 |
| --- | --- | --- |
| 查找、插入、删除单个整数键 | $O(1)$ | $O(n)$ |
| 遍历所有元素 | $O(n)$ | $O(n)$ |

若许多键集中到同一个桶，查找就可能接近线性扫描。字符串键的哈希代价还与长度有关。若题目要求按键顺序遍历、求前驱或后继，可以使用 `std::map` 或 `std::set`。

## 3. C++ STL 用法

- `std::unordered_set<T>` 只存键。用 `insert(x).second` 判断这次插入是否新增元素。
- `std::unordered_map<K, V>` 保存键和值。`++freq[x]` 适合计数，键不存在时会创建一个初值为 0 的整数项。
- 只查不改用 `find(x)`。例如 `freq[x] == 0` 也会插入缺失的键。
- 重新分桶会使迭代器失效。需要一边插入一边处理已有项时，避免在可能重新分桶的操作后继续使用旧迭代器。

## 4. 操作示例：和为 k 的连续子数组个数

令 `pre[i]` 为前 `i` 个元素的和。`[l, r)` 的和等于 `pre[r] - pre[l]`，所以扫描到 `r` 时，只要查询之前出现了多少个 `pre[r] - k`。

开始时把空前缀 0 记一次。每到一个新前缀，先贡献答案，再加入计数。这样 `k = 0` 时，当前前缀也不会和自己配出一个空区间。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 153" role="img" aria-label="前缀计数法中每个右端点贡献的区间数" fill="currentColor">
    <text x="14" y="23" text-anchor="start" dominant-baseline="middle" font-size="13">右端点 r</text>
    <rect x="136" y="9" width="58" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="165" y="23.5" text-anchor="middle" dominant-baseline="middle" font-size="14">0</text>
    <rect x="194" y="9" width="58" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="223" y="23.5" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <rect x="252" y="9" width="58" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="281" y="23.5" text-anchor="middle" dominant-baseline="middle" font-size="14">2</text>
    <rect x="310" y="9" width="58" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="339" y="23.5" text-anchor="middle" dominant-baseline="middle" font-size="14">3</text>
    <text x="14" y="56" text-anchor="start" dominant-baseline="middle" font-size="13">前缀和</text>
    <rect x="136" y="42" width="58" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="165" y="56.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">0</text>
    <rect x="194" y="42" width="58" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="223" y="56.5" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <rect x="252" y="42" width="58" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="281" y="56.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">0</text>
    <rect x="310" y="42" width="58" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="339" y="56.5" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <text x="14" y="89" text-anchor="start" dominant-baseline="middle" font-size="13">需要的前缀</text>
    <rect x="136" y="75" width="58" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="165" y="89.5" text-anchor="middle" dominant-baseline="middle" font-size="14">—</text>
    <rect x="194" y="75" width="58" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="223" y="89.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">0</text>
    <rect x="252" y="75" width="58" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="281" y="89.5" text-anchor="middle" dominant-baseline="middle" font-size="14">−1</text>
    <rect x="310" y="75" width="58" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="339" y="89.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">0</text>
    <text x="14" y="122" text-anchor="start" dominant-baseline="middle" font-size="13">新增区间数</text>
    <rect x="136" y="108" width="58" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="165" y="122.5" text-anchor="middle" dominant-baseline="middle" font-size="14">—</text>
    <rect x="194" y="108" width="58" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="223" y="122.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">1</text>
    <rect x="252" y="108" width="58" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="281" y="122.5" text-anchor="middle" dominant-baseline="middle" font-size="14">0</text>
    <rect x="310" y="108" width="58" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="339" y="122.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">2</text>
  </svg>
  <figcaption>k = 1 时，两个值为 0 的历史前缀都能与最后一个前缀配对。</figcaption>
</figure>

```cpp
#include <unordered_map>
#include <vector>

long long count_subarrays(const std::vector<int>& a, long long k) {
    std::unordered_map<long long, long long> freq;
    freq.reserve(a.size() + 1);
    freq.emplace(0, 1);

    long long prefix = 0, answer = 0;
    for (int x : a) {
        prefix += x;
        auto it = freq.find(prefix - k);
        if (it != freq.end()) answer += it->second;
        ++freq[prefix];
    }
    return answer;
}
```

以 `[1, -1, 1]`、`k = 1` 为例，连续子数组 `[0, 1)`、`[0, 3)`、`[2, 3)` 都满足条件，答案为 3。负数会让窗口和在扩张时下降，这个做法仍然成立。算法平均时间为 $O(n)$，空间为 $O(n)$，前缀和及答案要使用足够宽的整数类型。

<aside class="ds-note" aria-label="计数边界">
  <p><strong>重复前缀。</strong>同一个前缀和可能来自不同左端点。每个左端点都对应一个独立的区间，所以哈希表要存出现次数。</p>
</aside>

## 5. 按键的性质选容器

| 键和操作 | 可选结构 | 考虑什么 |
| --- | --- | --- |
| 值域小且密集的整数键 | 数组或 `vector` | 直接用下标，时间稳定 |
| 值域大，只查精确键 | `unordered_map` | 平均查询快，遍历顺序无保证 |
| 需要按序遍历、找前驱或后继 | `map` | 单次查询、插入、删除有对数保证 |
| 一次读入、之后只查询 | 排序数组和二分 | 顺序存储，支持区间边界查找 |

自定义键时，相等判断认为等价的两个键必须得到相同的哈希值。如果把键制成二元组并自行写哈希函数，两个分量都应参与计算。键的等价关系仍由比较函数决定，不能只比较哈希值。
