---
title: "线段树（Segment Tree）"
excerpt: "线段树怎样拆分区间，以及如何实现单点修改和区间求和。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

线段树（Segment Tree）把一段区间递归二分。每个结点负责一段区间，并保存可由左右孩子合并得到的信息，例如和、最小值、最大值或 GCD。单个位置是一个叶子。

## 2. 结构与工作原理

### 2.1 区间划分和合并

若用半开区间，`[l,r)` 被分成 `[l,m)` 和 `[m,r)`，其中 `m=l+(r-l)/2`。当 `r-l=1` 时到达叶子。父结点通过加法、取最值等方式合并两个孩子。合并函数需要满足结合律。

### 2.2 查询与单点修改

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 153" role="img" aria-label="线段树拆分查询区间 [1, 4)" fill="currentColor">
    <path d="M200 35 L134 61" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M240 35 L306 61" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M100 83 L66 110" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M135 83 L171 110" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M305 83 L270 110" fill="none" stroke="currentColor" stroke-opacity=".38" stroke-width="1.5"/>
    <path d="M341 83 L375 110" fill="none" stroke="currentColor" stroke-opacity=".38" stroke-width="1.5"/>
    <rect x="180" y="12" width="80" height="25" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="220" y="25.5" text-anchor="middle" dominant-baseline="middle" font-size="14">[0, 4)</text>
    <rect x="77" y="59" width="80" height="25" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="117" y="72.5" text-anchor="middle" dominant-baseline="middle" font-size="14">[0, 2)</text>
    <rect x="283" y="59" width="80" height="25" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="323" y="72.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">[2, 4)</text>
    <rect x="39" y="109" width="58" height="25" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="68" y="122.5" text-anchor="middle" dominant-baseline="middle" font-size="14">[0, 1)</text>
    <rect x="142" y="109" width="58" height="25" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="171" y="122.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">[1, 2)</text>
    <rect x="245" y="109" width="58" height="25" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="274" y="122.5" text-anchor="middle" dominant-baseline="middle" font-size="14">[2, 3)</text>
    <rect x="348" y="109" width="58" height="25" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="377" y="122.5" text-anchor="middle" dominant-baseline="middle" font-size="14">[3, 4)</text>
  </svg>
  <figcaption>查询 [1, 4) 时，合并完整覆盖的 [1, 2) 和 [2, 4) 两个节点。</figcaption>
</figure>

查询 `[1,4)` 时，`[2,4)` 可以整段使用，`[0,2)` 只部分相交，就继续向下取 `[1,2)`。修改单点时，从叶子更新，再沿祖先向上重算。无交集时，区间和可以返回 0 作为合并的单位元，区间最小值则使用正无穷。

### 2.3 懒标记

整段加 `x` 时，长度为 `len` 的结点区间和立即增加 `len*x`。给结点留下 `+x` 的待下传标记，只有下一次操作需要访问部分子区间时，才传给左右孩子。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 133" role="img" aria-label="线段树的根先加上增量，再向孩子下传懒标记" fill="currentColor">
    <text x="73" y="12" text-anchor="middle" dominant-baseline="middle" font-size="13">初始</text>
    <text x="219" y="12" text-anchor="middle" dominant-baseline="middle" font-size="13">整段加 5</text>
    <text x="366" y="12" text-anchor="middle" dominant-baseline="middle" font-size="13">下传后</text>
    <path d="M66 55 L54 74" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <path d="M80 55 L92 74" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <circle cx="73" cy="45" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="73" y="46" text-anchor="middle" dominant-baseline="middle" font-size="12">10</text>
    <circle cx="47" cy="84" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="47" y="85" text-anchor="middle" dominant-baseline="middle" font-size="14">3</text>
    <circle cx="99" cy="84" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="99" y="85" text-anchor="middle" dominant-baseline="middle" font-size="14">7</text>
    <path d="M111 62 L144 62" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M138 58 L144 62 L138 66" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-width="1.6"/>
    <path d="M212 55 L200 74" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <path d="M226 55 L238 74" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <circle cx="219" cy="45" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="219" y="46" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700">30</text>
    <circle cx="193" cy="84" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="193" y="85" text-anchor="middle" dominant-baseline="middle" font-size="14">3</text>
    <circle cx="245" cy="84" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="245" y="85" text-anchor="middle" dominant-baseline="middle" font-size="14">7</text>
    <path d="M257 62 L290 62" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M284 58 L290 62 L284 66" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-width="1.6"/>
    <path d="M359 55 L347 74" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <path d="M373 55 L385 74" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <circle cx="366" cy="45" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="366" y="46" text-anchor="middle" dominant-baseline="middle" font-size="12">30</text>
    <circle cx="340" cy="84" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="340" y="85" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700">13</text>
    <circle cx="392" cy="84" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="392" y="85" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700">17</text>
    <text x="219" y="114" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">根有待下传的 +5</text>
    <text x="366" y="114" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">根的标记清零</text>
  </svg>
  <figcaption>在需要读取子区间之前，把 +5 应用给两个长度均为 2 的孩子。</figcaption>
</figure>

父结点的值已经包含标记的影响。下传只更新孩子以及孩子的标记，父结点自己的标记清零。

## 3. 基本操作及时间复杂度

| 操作 | 时间复杂度 |
| --- | --- |
| 建树 | $O(n)$ |
| 单点修改、区间查询 | $O(\log n)$ |
| 用懒标记做区间加 | $O(\log n)$ |
| 存储区间值和标记 | $O(n)$ |

查询时每层至多有两个与范围部分相交、需要继续向下拆分的结点。其余结点要么整段使用，要么跳过，所以访问量与树高同阶。

<aside class="ds-note" aria-label="懒标记何时下传">
  <p><strong>懒标记何时下传。</strong>整段覆盖可直接改当前和并累计标记。只有需要向下查询或修改子区间时，再分发给孩子。</p>
</aside>

## 4. C++ 代码实现

### 4.1 单点赋值、区间求和

把叶子数补到二次幂，根用下标 1。`set_value(i,x)` 修改第 `i` 项并更新父结点；`query(l,r)` 查询 `[l,r)`。迭代查询每轮先取不能和相邻块一起向上合并的边端，再进入父层。

```cpp
#include <iostream>
#include <vector>
using namespace std;

int base;
vector<long long> tree;

void build(const vector<int>& a) {
    base = 1;
    while (base < int(a.size())) base *= 2;
    tree.assign(2 * base, 0);

    for (int i = 0; i < int(a.size()); ++i) tree[base + i] = a[i];
    for (int p = base - 1; p > 0; --p) tree[p] = tree[2 * p] + tree[2 * p + 1];
}

void set_value(int i, int x) {
    int p = base + i;
    tree[p] = x;
    for (p /= 2; p > 0; p /= 2) tree[p] = tree[2 * p] + tree[2 * p + 1];
}

long long query(int l, int r) {
    long long ans = 0;
    for (l += base, r += base; l < r; l /= 2, r /= 2) {
        if (l % 2 == 1) ans += tree[l++];
        if (r % 2 == 1) ans += tree[--r];
    }
    return ans;
}

int main() {
    build({1, 2, 3, 4});
    cout << query(1, 4) << '\n';
    set_value(2, 8);
    cout << query(1, 4) << '\n';
}
```

运行结果

```text
9
14
```

### 4.2 区间加、区间求和

下面改用递归。整段覆盖时直接更新和与标记，部分覆盖时先下传。数组须非空，操作使用合法的 0 起始半开区间。示例在 `[0,4)` 上加 5，再读取 `[1,3)`。

```cpp
#include <iostream>
#include <vector>
using namespace std;

vector<long long> tree, lazy;

void build(int p, int l, int r, const vector<int>& a) {
    if (r - l == 1) {
        tree[p] = a[l];
        return;
    }
    int m = (l + r) / 2;
    build(p * 2, l, m, a);
    build(p * 2 + 1, m, r, a);
    tree[p] = tree[p * 2] + tree[p * 2 + 1];
}

void apply_add(int p, int len, long long x) {
    tree[p] += len * x;
    lazy[p] += x;
}

void push(int p, int l, int r) {
    if (lazy[p] == 0) return;
    int m = (l + r) / 2;
    apply_add(p * 2, m - l, lazy[p]);
    apply_add(p * 2 + 1, r - m, lazy[p]);
    lazy[p] = 0;
}

void add(int p, int l, int r, int ql, int qr, long long x) {
    if (qr <= l || r <= ql) return;
    if (ql <= l && r <= qr) {
        apply_add(p, r - l, x);
        return;
    }
    push(p, l, r);
    int m = (l + r) / 2;
    add(p * 2, l, m, ql, qr, x);
    add(p * 2 + 1, m, r, ql, qr, x);
    tree[p] = tree[p * 2] + tree[p * 2 + 1];
}

long long sum(int p, int l, int r, int ql, int qr) {
    if (qr <= l || r <= ql) return 0;
    if (ql <= l && r <= qr) return tree[p];
    push(p, l, r);
    int m = (l + r) / 2;
    return sum(p * 2, l, m, ql, qr) + sum(p * 2 + 1, m, r, ql, qr);
}

int main() {
    vector<int> a = {1, 2, 3, 4};
    int n = int(a.size());
    tree.resize(4 * n);
    lazy.resize(4 * n);
    build(1, 0, n, a);

    cout << sum(1, 0, n, 0, 4) << '\n';
    add(1, 0, n, 0, 4, 5);
    cout << sum(1, 0, n, 1, 3) << '\n';
}
```

运行结果

```text
10
15
```

## 5. STL 中的对应容器

STL 没有对应容器。用 `vector<long long>` 存结点值和懒标记。递归建树通常分配 `4*n` 个位置；将叶子补到二次幂之后也可以显式计算所需结点数。

## 6. 典型应用场景

### 6.1 典型用法

- 动态维护区间和、最值、GCD。
- 区间加或赋值。赋值会覆盖较早的操作，若同时支持赋值与加法，要按时间顺序组合标记。
- 非负数组上做树上二分。比较左子树的和与目标，就能决定最早达到目标的前缀在哪一边。

### 6.2 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 P3372 线段树 1](https://www.luogu.com.cn/problem/P3372) | 区间加、区间求和，正确维护和下传标记 |

## 7. 优点与局限性

线段树能维护多种可合并的信息，还能通过标记支持整段修改，适用面广。代价是多维护结点区间与标记，常数也比树状数组大。数组静态时可用前缀和或 ST 表，单点加与区间求和也可优先考虑树状数组。
