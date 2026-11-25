---
title: "树状数组（Fenwick Tree）"
excerpt: "树状数组的 lowbit、前缀分块，以及单点增加和区间求和的完整示例。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

树状数组（Fenwick Tree，又称 BIT）用数组记录一组可重叠的小区间。每次修改只更新少量区间，查询时取若干互不重叠的区间拼成一个前缀。用于维护可做前缀差的统计量，最常见的是和。

## 2. 结构与工作原理

### 2.1 `lowbit` 与结点覆盖范围

下标从 1 开始。`lowbit(i)=i & -i` 得到最低位二进制 1 的权值。`bit[i]` 对应闭区间 `[i-lowbit(i)+1,i]`。例如 6 的二进制是 `110`，所以 `bit[6]` 覆盖位置 5 和 6。

### 2.2 查询时向左分块

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 110" role="img" aria-label="树状数组将前 7 项拆成长度为 4、2、1 的三个块" fill="currentColor">
    <path d="M47 33 L217 33" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M47 33 L47 38" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M217 33 L217 38" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <text x="132" y="23" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="700">bit[4]</text>
    <path d="M223 33 L305 33" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M223 33 L223 38" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M305 33 L305 38" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <text x="264" y="23" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="700">bit[6]</text>
    <path d="M311 33 L349 33" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M311 33 L311 38" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M349 33 L349 38" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <text x="330" y="23" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="700">bit[7]</text>
    <rect x="44" y="47" width="44" height="29" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="66" y="62.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">1</text>
    <rect x="88" y="47" width="44" height="29" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="110" y="62.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">2</text>
    <rect x="132" y="47" width="44" height="29" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="154" y="62.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">3</text>
    <rect x="176" y="47" width="44" height="29" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="198" y="62.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">4</text>
    <rect x="220" y="47" width="44" height="29" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="242" y="62.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">5</text>
    <rect x="264" y="47" width="44" height="29" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="286" y="62.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">6</text>
    <rect x="308" y="47" width="44" height="29" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="330" y="62.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">7</text>
    <rect x="352" y="47" width="44" height="29" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="374" y="62.5" text-anchor="middle" dominant-baseline="middle" font-size="14">8</text>
    <text x="220" y="93" text-anchor="middle" dominant-baseline="middle" font-size="13">内部下标，按 7 → 6 → 4 → 0 向左跳</text>
  </svg>
  <figcaption>前 7 项的和等于 bit[7]、bit[6]、bit[4] 三段之和。</figcaption>
</figure>

求前 7 项时先取 `bit[7]`。接着把右端点减去 `lowbit(7)=1`，剩下前 6 项。继续取 `bit[6]` 和 `bit[4]`，三块拼成完整前缀。

### 2.3 修改时向上跳

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 145" role="img" aria-label="修改内部下标 3 会更新三个覆盖块" fill="currentColor">
    <text x="14" y="27" text-anchor="start" dominant-baseline="middle" font-size="13">内部下标</text>
    <rect x="122" y="13" width="34" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="139" y="27.5" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <rect x="156" y="13" width="34" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="173" y="27.5" text-anchor="middle" dominant-baseline="middle" font-size="14">2</text>
    <rect x="190" y="13" width="34" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="207" y="27.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">3</text>
    <rect x="224" y="13" width="34" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="241" y="27.5" text-anchor="middle" dominant-baseline="middle" font-size="14">4</text>
    <rect x="258" y="13" width="34" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="275" y="27.5" text-anchor="middle" dominant-baseline="middle" font-size="14">5</text>
    <rect x="292" y="13" width="34" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="309" y="27.5" text-anchor="middle" dominant-baseline="middle" font-size="14">6</text>
    <rect x="326" y="13" width="34" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="343" y="27.5" text-anchor="middle" dominant-baseline="middle" font-size="14">7</text>
    <rect x="360" y="13" width="34" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="377" y="27.5" text-anchor="middle" dominant-baseline="middle" font-size="14">8</text>
    <text x="13" y="63" text-anchor="start" dominant-baseline="middle" font-size="13">bit[3]</text>
    <rect x="190" y="50" width="34" height="24" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="13" y="94" text-anchor="start" dominant-baseline="middle" font-size="13">bit[4]</text>
    <rect x="122" y="81" width="136" height="24" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="13" y="125" text-anchor="start" dominant-baseline="middle" font-size="13">bit[8]</text>
    <rect x="122" y="112" width="272" height="24" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
  </svg>
  <figcaption>从 3 开始不断加 lowbit，访问 3、4、8。标亮的区间都包含下标 3。</figcaption>
</figure>

位置 3 改变时，依次更新 `bit[3]、bit[4]、bit[8]`，直到下标大于 `n`。每次向上加 `lowbit`，都跳过与当前位置没有覆盖关系的块。

## 3. 基本操作及时间复杂度

| 操作 | 做法 | 时间复杂度 |
| --- | --- | --- |
| 单点加增量 | 用 `i += lowbit(i)` 更新覆盖块 | $O(\log n)$ |
| 查询前缀和 | 用 `i -= lowbit(i)` 取出块 | $O(\log n)$ |
| 查询闭区间和 | 两个前缀和相减 | $O(\log n)$ |
| 用 `n` 次单点增加建树 | 逐个加入初始值 | $O(n\log n)$ |
| 线性建树 | 按下标把完整块累加到父块 | $O(n)$ |

存储空间为 $O(n)$。若题目要求把一个位置设为新值，可保存原值，把赋值换成增加 `新值 - 原值`。

<aside class="ds-note" aria-label="不要更新下标 0">
  <p><strong>不要更新下标 0。</strong><code>lowbit(0)</code> 等于 0，更新循环会停在 0。外部 0 起始的位置传入前先加 1。</p>
</aside>

## 4. C++ 代码实现

`add(i,delta)` 增加第 `i` 项，`sum(i)` 查询从 1 到 `i` 的前缀和。令 `sum(0)=0`，则 `[l,r]` 的和为 `sum(r)-sum(l-1)`。

```cpp
#include <iostream>
#include <vector>
using namespace std;

int n;
vector<long long> bit;

void add(int i, int delta) {
    for (; i <= n; i += i & -i) bit[i] += delta;
}

long long sum(int i) {
    long long ans = 0;
    for (; i > 0; i -= i & -i) ans += bit[i];
    return ans;
}

int main() {
    int a[] = {1, 2, 3, 4};
    n = 4;
    bit.assign(n + 1, 0);
    for (int i = 1; i <= n; ++i) add(i, a[i - 1]);

    cout << sum(4) - sum(1) << '\n';  // [2, 4]
    add(3, 5);
    cout << sum(4) - sum(1) << '\n';
}
```

运行结果

```text
9
14
```

线性建树时先让每个 `bit[i]` 加上 `a[i]`，再按从小到大的顺序，把已累积的 `bit[i]` 加给范围内的 `bit[i+lowbit(i)]`。每个结点只向上交一次。

## 5. STL 中的对应容器

STL 没有直接对应容器。用 `vector<long long>` 就能保存前缀统计。若维护频次，也可用数组保存原值，再用树状数组维护离散化后的计数。

## 6. 典型应用场景

### 6.1 动态区间与逆序对

- 单点增加与动态区间求和。
- 对差分维护树状数组。给 `[l,r]` 加 `x`，在 `l` 加 `x`，若 `r+1` 合法就在那里减 `x`。差分前缀和即为当前单点值。
- 统计逆序对。从右向左扫，用值的离散化秩查询严格比当前值小的已读元素数，再加入当前值。

### 6.2 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 P3374 树状数组 1](https://www.luogu.com.cn/problem/P3374) | 单点增加和区间求和 |
| [洛谷 P3368 树状数组 2](https://www.luogu.com.cn/problem/P3368) | 在差分数组上做区间增加与单点查询 |

## 7. 优点与局限性

树状数组的代码短、存储连续，适合频繁更新和求前缀和。一般区间最值无法用两个前缀最值作差。若需要区间最值和任意更新、或更复杂的区间标记，可以使用线段树。
