---
title: "数组（Array）"
excerpt: "从连续存储和随机访问出发，讲解 C++ 数组容器、前缀和与差分。"
---

[← 返回数据结构总览](../)

## 1. 连续存储怎样带来随机访问？

设每个元素占 `s` 字节，首元素的地址为 `base`。下标 `i` 对应的地址是 `base + i * s`，所以访问下标 `1000` 和访问下标 `0` 都只需要算一次位置。数组还保留了元素顺序，适合用下标表达「第几个位置」「哪一行哪一列」。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 103" role="img" aria-label="数组的连续存储和按下标访问" fill="currentColor">
    <text x="100" y="16" text-anchor="middle" dominant-baseline="middle" font-size="14" opacity=".76">0</text>
    <text x="160" y="16" text-anchor="middle" dominant-baseline="middle" font-size="14" opacity=".76">1</text>
    <text x="220" y="16" text-anchor="middle" dominant-baseline="middle" font-size="14" opacity=".76">2</text>
    <text x="280" y="16" text-anchor="middle" dominant-baseline="middle" font-size="14" opacity=".76">3</text>
    <text x="340" y="16" text-anchor="middle" dominant-baseline="middle" font-size="14" opacity=".76">4</text>
    <rect x="70" y="31" width="60" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="100" y="49" text-anchor="middle" dominant-baseline="middle" font-size="14">4</text>
    <rect x="130" y="31" width="60" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="160" y="49" text-anchor="middle" dominant-baseline="middle" font-size="14">7</text>
    <rect x="190" y="31" width="60" height="34" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="220" y="49" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">2</text>
    <rect x="250" y="31" width="60" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="280" y="49" text-anchor="middle" dominant-baseline="middle" font-size="14">9</text>
    <rect x="310" y="31" width="60" height="34" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="340" y="49" text-anchor="middle" dominant-baseline="middle" font-size="14">6</text>
    <path d="M220 83 L220 68" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M216.0 74.0 L220 68 L224.0 74.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <text x="220" y="94" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">a[2]</text>
  </svg>
  <figcaption>下标 2 对应第三个元素，直接读到 2。</figcaption>
</figure>

在长度为 5 的数组里，合法下标是 `0` 到 `4`。半开区间 `[l, r)` 包含 `l`、排除 `r`，长度正好是 `r - l`。例如 `[1, 4)` 对应下标 `1、2、3`。空区间可写成 `[l, l)`，整段数组可写成 `[0, n)`。

## 2. 常用操作与代价

| 操作 | 时间复杂度 | 代价来自哪里 |
| --- | --- | --- |
| 按下标读写 | $O(1)$ | 直接定位 |
| 顺序遍历或查找无序数组 | $O(n)$ | 最多检查全部元素 |
| 在有序数组中二分 | $O(\log n)$ | 每次排除近一半区间 |
| 保序地在中间插入或删除 | 最坏 $O(n)$ | 后续元素需要移动 |
| `vector` 尾部追加 | 均摊 $O(1)$ | 个别扩容会搬移已有元素 |

若删除时允许改变顺序，可以用末尾元素覆盖待删元素，再 `pop_back()`。知道待删下标时，这只需 $O(1)$；找到那个下标的成本要另外算。

## 3. C++ 容器怎么选？

- `std::array<T, N>` 的长度在编译时确定，适合固定大小的数据。
- `std::vector<T>` 的长度可以在运行时决定。`size()` 是已有元素数，`capacity()` 是当前存储空间最多能容纳的元素数。
- `reserve(n)` 只预留容量，`resize(n)` 才改变元素数。空向量 `reserve(100)` 后仍不能访问 `a[0]`。
- 扩容会使原来的迭代器、指针和引用失效。需要跨多次追加记住某个位置时，通常保存下标，并留意中间插入和删除也会改变下标对应的元素。

## 4. 操作示例：多次区间求和和批量修改

设 `pre[i]` 为前 `i` 个元素的和，`pre[0] = 0`。`[l, r)` 的和等于 `pre[r] - pre[l]`。例如数组 `[4, 7, 2, 9]` 的前缀和是 `[0, 4, 11, 13, 22]`，`[1, 3)` 的和是 `13 - 4 = 9`。

如果所有查询之前先有一批区间加，可以用差分记录影响从哪里开始、在哪里结束。对 `[l, r)` 加 `x`，在 `delta[l]` 加 `x`，在 `delta[r]` 减 `x`。沿数组累加差分，就得到每个位置应加的值。下面假设所有区间合法。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 156" role="img" aria-label="差分记录区间加法的起点和终点" fill="currentColor">
    <text x="154" y="13" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">0</text>
    <text x="205" y="13" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">1</text>
    <text x="256" y="13" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">2</text>
    <text x="307" y="13" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">3</text>
    <text x="358" y="13" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">4</text>
    <text x="14" y="40" text-anchor="start" dominant-baseline="middle" font-size="13">原数组</text>
    <rect x="129" y="26" width="51" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="154.5" y="40.5" text-anchor="middle" dominant-baseline="middle" font-size="14">4</text>
    <rect x="180" y="26" width="51" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="205.5" y="40.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">7</text>
    <rect x="231" y="26" width="51" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="256.5" y="40.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">2</text>
    <rect x="282" y="26" width="51" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="307.5" y="40.5" text-anchor="middle" dominant-baseline="middle" font-size="14">9</text>
    <text x="14" y="71" text-anchor="start" dominant-baseline="middle" font-size="13">差分标记</text>
    <rect x="129" y="57" width="51" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="154.5" y="71.5" text-anchor="middle" dominant-baseline="middle" font-size="14">0</text>
    <rect x="180" y="57" width="51" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="205.5" y="71.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">+3</text>
    <rect x="231" y="57" width="51" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="256.5" y="71.5" text-anchor="middle" dominant-baseline="middle" font-size="14">0</text>
    <rect x="282" y="57" width="51" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="307.5" y="71.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">−3</text>
    <rect x="333" y="57" width="51" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="358.5" y="71.5" text-anchor="middle" dominant-baseline="middle" font-size="14">0</text>
    <text x="14" y="102" text-anchor="start" dominant-baseline="middle" font-size="13">累加的增量</text>
    <rect x="129" y="88" width="51" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="154.5" y="102.5" text-anchor="middle" dominant-baseline="middle" font-size="14">0</text>
    <rect x="180" y="88" width="51" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="205.5" y="102.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">3</text>
    <rect x="231" y="88" width="51" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="256.5" y="102.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">3</text>
    <rect x="282" y="88" width="51" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="307.5" y="102.5" text-anchor="middle" dominant-baseline="middle" font-size="14">0</text>
    <text x="14" y="133" text-anchor="start" dominant-baseline="middle" font-size="13">修改后的值</text>
    <rect x="129" y="119" width="51" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="154.5" y="133.5" text-anchor="middle" dominant-baseline="middle" font-size="14">4</text>
    <rect x="180" y="119" width="51" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="205.5" y="133.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">10</text>
    <rect x="231" y="119" width="51" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="256.5" y="133.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">5</text>
    <rect x="282" y="119" width="51" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="307.5" y="133.5" text-anchor="middle" dominant-baseline="middle" font-size="14">9</text>
  </svg>
  <figcaption>对 [1, 3) 加 3。增量在下标 1 开始，在下标 3 抵消。</figcaption>
</figure>

```cpp
#include <tuple>
#include <vector>

struct ArrayQuery {
    std::vector<long long> pre;

    ArrayQuery(const std::vector<long long>& a,
               const std::vector<std::tuple<int, int, long long>>& updates)
        : pre(a.size() + 1, 0) {
        std::vector<long long> delta(a.size() + 1, 0);
        for (auto [l, r, x] : updates) {
            delta[l] += x;
            delta[r] -= x;
        }

        long long added = 0;
        for (std::size_t i = 0; i < a.size(); ++i) {
            added += delta[i];
            pre[i + 1] = pre[i] + a[i] + added;
        }
    }

    long long sum(int l, int r) const {
        return pre[r] - pre[l];
    }
};
```

批量处理 $m$ 次修改再建前缀和共 $O(n+m)$，每次查询 $O(1)$。若修改和查询交替出现，单次修改可能改变其后的所有前缀和，可以使用树状数组。

<aside class="ds-note" aria-label="边界检查">
  <p><strong>右边界。</strong>对整个数组 [0, n) 加值时，需要在 delta[n] 记下影响结束的位置。结果只恢复到 a[n-1]，因此差分数组比原数组多开一格。</p>
</aside>

## 5. 二维数组和离散化

二维内置数组 `int a[R][C]` 按行排列，同行元素连续。也可以用一维 `vector` 存矩形网格，把 `(r, c)` 变为 `r * C + c`。逐行访问通常有更好的局部性。`vector<vector<int>>` 每行是独立的向量，可以存不同行长，整张表的元素不保证连在一块。

键的值域过大、又只需要保留值之间的大小关系时，可以把所有键排序去重，每个键用它的秩替代。离散化保留先后和相等关系。例如 `[-8, 100, -8, 3]` 变成 `[0, 2, 0, 1]`。原数值的差、和或区间实际长度仍要用原值计算。
