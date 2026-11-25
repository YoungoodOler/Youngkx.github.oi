---
title: "数组（Array）"
excerpt: "数组的连续存储、下标访问和基本操作，以及 C++ 中 array 与 vector 的用法。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

数组（Array）用连续的存储空间保存一组同类型元素。每个位置有一个下标。若元素类型为 `T`，有了首地址和下标 `i`，就能直接计算 `a[i]` 的地址。按下标读取或修改都只需 $O(1)$。

C++ 下标从 0 开始，长度为 `n` 时最后一个位置是 `n-1`。下标用于表示位置，可以有相同的元素值。

## 2. 结构与工作原理

### 2.1 内存布局与随机访问

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

设首地址为 `base`，元素大小为 `sizeof(T)`。第 `i` 个下标对应 `base + i * sizeof(T)`。例如一个 `int` 在某个平台占 4 字节，若首地址为 1000，下标 2 就对应地址 1008。

### 2.2 插入、删除和扩容

在 `[4, 7, 2]` 的下标 1 插入 `9`，为了保持顺序，要先把 `7`、`2` 后移。删除也要把后面的元素补到前面。仅删除尾元素时没有搬移。若不要求保序，可以用末尾元素覆盖待删位置，再删除尾部。

`vector` 有 `size` 和 `capacity`。容量有余时可直接追加。空间用完时，容器会扩容，并将已有元素搬到新空间。扩容后原有指针、引用和迭代器都失效。

### 2.3 一维、二维和区间约定

半开区间 `[l, r)` 包含 `l`，长度是 `r-l`。整段用 `[0,n)`，空区间用 `[i,i)`。二维内置数组按行存储，固定列数为 `m` 时，坐标 `(r,c)` 也可放到一维数组的 `r*m+c`。

## 3. 基本操作及时间复杂度

| 操作 | 条件 | 时间复杂度 |
| --- | --- | --- |
| 访问、修改一个位置 | 已知合法下标 | $O(1)$ |
| 遍历、在无序数组中查找 | 无额外索引 | $O(n)$ |
| 二分查找 | 数组已经有序 | $O(\log n)$ |
| 中间插入、删除 | 保留原顺序 | 最坏 $O(n)$ |
| `vector::push_back` | 在尾部追加 | 均摊 $O(1)$ |
| `vector::pop_back` | 尾部删除，数组非空 | $O(1)$ |

存储 `n` 个元素需要 $O(n)$ 空间。动态数组为扩容可能保留尚未使用的容量。

<aside class="ds-note" aria-label="越界与扩容">
  <p><strong>越界与扩容。</strong><code>i == size()</code> 已经越界。保存元素引用后若调用了可能扩容的接口，应重新取得引用。</p>
</aside>

## 4. C++ 代码实现

### 4.1 前缀和

`pre[i]` 表示前 `i` 个元素的和，`pre[0] = 0`。区间 `[l,r)` 的和等于 `pre[r] - pre[l]`。这样第一次扫描花 $O(n)$，之后每次求和只花 $O(1)$。

### 4.2 差分和批量区间增加

对 `[l,r)` 的每个元素加 `x`，只在 `diff[l]` 加 `x`、`diff[r]` 减 `x`。从左到右累加差分得到当前位置的增量。`diff` 比原数组多开一格，处理 `r == n` 的情况。

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

下面把 `[4,7,2,9]` 的 `[1,3)` 加 3，再求这段以及全数组的和。

```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> a = {4, 7, 2, 9};
    int n = int(a.size());
    vector<long long> diff(n + 1), pre(n + 1);

    diff[1] += 3;
    diff[3] -= 3;

    long long added = 0;
    for (int i = 0; i < n; ++i) {
        added += diff[i];
        pre[i + 1] = pre[i] + a[i] + added;
    }

    cout << pre[3] - pre[1] << '\n';
    cout << pre[n] << '\n';
}
```

运行结果

```text
15
28
```

批量做 `q` 次修改再恢复数组并建前缀和，耗时 $O(n+q)$。查询和修改交替出现时，可以用树状数组。

## 5. STL 中的对应容器

| 容器 | 头文件 | 适用情况 |
| --- | --- | --- |
| `array<T,N>` | `<array>` | 长度编译时确定，内部连续存储 |
| `vector<T>` | `<vector>` | 长度运行时确定，需要追加或改变大小 |

| `vector` 成员 | 含义 |
| --- | --- |
| `size()` / `capacity()` | 已有元素数 / 当前可容纳元素数 |
| `push_back(x)` / `pop_back()` | 尾部增加 / 删除 |
| `resize(n)` | 把实际元素数改为 `n` |
| `reserve(n)` | 预留容量，元素数保持原值 |
| `a[i]` / `a.at(i)` | 访问下标，后者检查越界 |

```cpp
#include <array>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    array<int, 3> fixed = {4, 7, 2};
    vector<int> a(fixed.begin(), fixed.end());

    a[1] = 8;
    a.push_back(9);

    for (int x : a) cout << x << ' ';
    cout << '\n';
}
```

运行结果

```text
4 8 2 9
```

## 6. 典型应用场景

### 6.1 竞赛中的使用

- 频次统计和离散化。键的值域小可直接当下标，值域大可先排序去重，用秩替代原值。
- 前缀和、差分、滚动数组。利用下标和相邻位置之间的关系组织计算。
- 网格和动态规划。用二维数组保存坐标或状态，使用一维数组压缩时要明确映射规则。

### 6.2 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 P8218 求区间和](https://www.luogu.com.cn/problem/P8218) | 建前缀和，将题目区间换成一致的下标约定 |

## 7. 优点与局限性

数组适合大量按下标访问、顺序扫描和二分。连续布局通常具有较好的缓存局部性。需要保序地反复在中间插入、删除时，移动元素的代价会随长度增长。

内置数组和 `operator[]` 都要求合法下标。`reserve(n)` 以后仍要用 `size()` 判断是否合法。累加或涉及乘积时，按数据范围选整数类型。
