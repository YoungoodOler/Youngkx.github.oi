---
title: "哈希表（Hash Table）"
excerpt: "哈希值、分桶和冲突，以及 unordered_map 和 unordered_set 的用法。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

哈希表（Hash Table）根据键来存取数据。哈希函数把键转换成一个哈希值，容器再据此选择桶。键和值可以是不同类型，例如用字符串作键、整数作计数。

## 2. 结构与工作原理

### 2.1 分桶与哈希冲突

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

以 `h(x)=x mod 4` 为例，5 和 9 都落入桶 1。不同的键落在相同位置称为冲突。链地址法可以让同一个桶保存多个键；找到桶后，还要按键的相等关系逐项核对。

### 2.2 负载因子和重新分桶

负载因子等于元素数除以桶数。表太拥挤时，容器可以增加桶数并重新安排元素。若提前知道不同键的大概数量，可先调用 `reserve(n)`。重新分桶会使旧迭代器失效。

### 2.3 表里应该存什么？

只需要判断是否见过一个键时，用集合。还要记录次数、位置或某个答案时，用映射。设计键时，相等判断认为相同的两个键必须得到相同的哈希值。

## 3. 基本操作及时间复杂度

| 操作 | 平均时间 | 最坏时间 |
| --- | --- | --- |
| 查找一个键 | $O(1)$ | $O(n)$ |
| 插入、删除一个键 | $O(1)$ | $O(n)$ |
| 遍历所有元素 | $O(n)$ | $O(n)$ |

表中把哈希计算和键比较视为常数。字符串键的计算与长度有关。存储元素和桶需要额外空间，通常将两者都控制在 $O(n)$ 量级。

<aside class="ds-note" aria-label="查找和写入">
  <p><strong>查找和写入。</strong>使用 <code>m[key]</code> 访问缺失键会插入新项。只想判断有没有这个键时用 <code>find</code>。</p>
</aside>

## 4. C++ 代码实现

### 4.1 统计和为 k 的连续子数组个数

令 `pre[r]` 表示前 `r` 项之和，则 `[l,r)` 的和为 `pre[r]-pre[l]`。因此只要统计此前出现了多少次 `pre[r]-k`。空前缀先计一次，每次先查旧前缀再加入当前前缀，避免把空区间算进去。

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

下面的数列是 `[1,-1,1]`，目标为 1，答案是 3。前缀和与区间数量用 `long long`。

```cpp
#include <iostream>
#include <unordered_map>
using namespace std;

int main() {
    int a[] = {1, -1, 1};
    int k = 1;
    unordered_map<long long, int> count;
    count[0] = 1;

    long long pre = 0, ans = 0;
    for (int x : a) {
        pre += x;
        auto it = count.find(pre - k);
        if (it != count.end()) ans += it->second;
        ++count[pre];
    }
    cout << ans << '\n';
}
```

运行结果

```text
3
```

## 5. STL 中的对应容器

| 容器 | 头文件 | 用途 |
| --- | --- | --- |
| `unordered_set` | `<unordered_set>` | 快速判断键是否存在 |
| `unordered_map` | `<unordered_map>` | 按键维护值或次数 |

| 常用接口 | 说明 |
| --- | --- |
| `find(key)` | 没找到返回 `end()` |
| `insert(...)`、`erase(key)` | 插入、按键删除 |
| `m[key]` | 读取或修改值，键缺失时会建立新项 |
| `reserve(n)` | 为预期的元素数量预留空间 |

```cpp
#include <iostream>
#include <unordered_map>
using namespace std;

int main() {
    int a[] = {2, 5, 2, 2};
    unordered_map<int, int> freq;

    for (int x : a) ++freq[x];

    cout << freq[2] << '\n';
    cout << (freq.find(5) != freq.end()) << '\n';
    freq.erase(5);
    cout << (freq.find(5) != freq.end()) << '\n';
}
```

运行结果

```text
3
1
0
```

## 6. 典型应用场景

### 6.1 典型用法

保存已出现的状态、离散值计数、按照首次出现顺序去重。用 `unordered_set` 作为已见集合 `seen`，遍历原输入时，只在 `seen.insert(x).second` 为真时输出 `x`。

### 6.2 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 P4305 不重复数字](https://www.luogu.com.cn/problem/P4305) | 快速判重并维持原输入第一次出现的次序 |

## 7. 优点与局限性

哈希表适合按键精确查找，平均速度快。若要有序遍历、查询前驱后继，使用 `map` 或 `set`。值域小且稠密时，直接用数组计数更简单。哈希表的最坏复杂度取决于冲突情况。
