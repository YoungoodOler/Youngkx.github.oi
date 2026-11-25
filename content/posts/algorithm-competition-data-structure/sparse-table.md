---
title: "ST 表（Sparse Table）"
excerpt: "ST 表的二次幂区间、预处理递推，以及 O(1) 的静态区间最值查询。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

ST 表（Sparse Table）预处理**静态数组**里的若干区间。它选择长度为 1、2、4、8 等二次幂的区间，因此可以复用较短区间的答案并覆盖任意查询范围。区间最小值是最常见的例子。

## 2. 结构与工作原理

### 2.1 预处理二次幂区间

设 `st[k][i]` 保存从 `i` 开始、长度为 $2^k$ 的区间最小值。`st[0][i]` 就是原数组的第 `i` 项。构建下一层时，将区间分成两个长度为 $2^{k-1}$ 的块，再取它们的最小值。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 137" role="img" aria-label="ST 表从两个长度为 2 的子块计算长度为 4 的块" fill="currentColor">
    <text x="110" y="11" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">1</text>
    <text x="176" y="11" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">2</text>
    <text x="242" y="11" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">3</text>
    <text x="308" y="11" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">4</text>
    <rect x="77" y="23" width="66" height="30" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="110" y="39" text-anchor="middle" dominant-baseline="middle" font-size="14">7</text>
    <rect x="143" y="23" width="66" height="30" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="176" y="39" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">5</text>
    <rect x="209" y="23" width="66" height="30" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="242" y="39" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">2</text>
    <rect x="275" y="23" width="66" height="30" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="308" y="39" text-anchor="middle" dominant-baseline="middle" font-size="14">9</text>
    <rect x="77" y="65" width="132" height="25" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <rect x="209" y="65" width="132" height="25" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="143" y="79" text-anchor="middle" dominant-baseline="middle" font-size="13">左半段最小值 5</text>
    <text x="275" y="79" text-anchor="middle" dominant-baseline="middle" font-size="13">右半段最小值 2</text>
    <rect x="77" y="101" width="264" height="25" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="209" y="114" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="700">整段最小值 2</text>
  </svg>
  <figcaption>用 st[1][1] 和 st[1][3] 得到 st[2][1]。</figcaption>
</figure>

$$
st[k][i]=\min(st[k-1][i],\,st[k-1][i+2^{k-1}]).
$$

### 2.2 查询为什么可以重叠？

对闭区间 `[l,r]`，令 `len=r-l+1`，取 $k=\lfloor\log_2 len\rfloor$。从左端和右端各取一个长度为 $2^k$ 的块。由于 $2^k\le len<2^{k+1}$，两块能盖住整个区间。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 147" role="img" aria-label="ST 表使用两个长度为 4 的重叠区间查询最小值" fill="currentColor">
    <path d="M91 26 L261 26" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M91 26 L91 31" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M261 26 L261 31" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <text x="176" y="16" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="700">左块 [1, 4]</text>
    <text x="66" y="45" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">0</text>
    <text x="110" y="45" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">1</text>
    <text x="154" y="45" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">2</text>
    <text x="198" y="45" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">3</text>
    <text x="242" y="45" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">4</text>
    <text x="286" y="45" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">5</text>
    <text x="330" y="45" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">6</text>
    <text x="374" y="45" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".76">7</text>
    <rect x="44" y="57" width="44" height="29" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="66" y="72.5" text-anchor="middle" dominant-baseline="middle" font-size="14">8</text>
    <rect x="88" y="57" width="44" height="29" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="110" y="72.5" text-anchor="middle" dominant-baseline="middle" font-size="14">7</text>
    <rect x="132" y="57" width="44" height="29" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="154" y="72.5" text-anchor="middle" dominant-baseline="middle" font-size="14">5</text>
    <rect x="176" y="57" width="44" height="29" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="198" y="72.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">2</text>
    <rect x="220" y="57" width="44" height="29" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="242" y="72.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">9</text>
    <rect x="264" y="57" width="44" height="29" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="286" y="72.5" text-anchor="middle" dominant-baseline="middle" font-size="14">4</text>
    <rect x="308" y="57" width="44" height="29" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="330" y="72.5" text-anchor="middle" dominant-baseline="middle" font-size="14">6</text>
    <rect x="352" y="57" width="44" height="29" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="374" y="72.5" text-anchor="middle" dominant-baseline="middle" font-size="14">3</text>
    <path d="M179 115 L349 115" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M179 115 L179 120" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M349 115 L349 120" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <text x="264" y="105" text-anchor="middle" dominant-baseline="middle" font-size="13" font-weight="700">右块 [3, 6]</text>
    <text x="220" y="137" text-anchor="middle" dominant-baseline="middle" font-size="13">查询 [1, 6]，两块共同覆盖下标 3、4</text>
  </svg>
  <figcaption>两块的最小值都是 2，重复覆盖的元素对结果没有影响。</figcaption>
</figure>

例如 `[1,6]` 长度是 6，取 `[1,4]` 和 `[3,6]`。重复取到某个值仍然不影响最小值。这也适用于最大值和 GCD。若维护和，重叠部分会被计两次。

## 3. 基本操作及时间复杂度

| 操作 | 时间或空间复杂度 |
| --- | --- |
| 预处理 | $O(n\log n)$ |
| 查询区间最小值 | $O(1)$ |
| 存储各层 | $O(n\log n)$ |
| 单点修改 | 通常需重建，频繁修改时换结构 |

上述复杂度把两项合并视为常量时间。若运算可以结合，但重复计算会改变结果，也能用若干互不重叠的二次幂区间合并，查询耗时 $O(\log n)$。

<aside class="ds-note" aria-label="查询区间">
  <p><strong>查询区间。</strong><code>query(l,r)</code> 含左右端点，长度为 <code>r-l+1</code>。不对空区间运行整数对数查询。</p>
</aside>

## 4. C++ 代码实现

程序使用 0 起始下标和闭区间。`lg[len]` 保存整数对数，避免反复计算。建每一层只枚举完整区间能够放进数组的起点。

```cpp
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

vector<int> lg;
vector<vector<int>> st;

void build(const vector<int>& a) {
    int n = int(a.size());
    lg.assign(n + 1, 0);
    for (int len = 2; len <= n; ++len) lg[len] = lg[len / 2] + 1;

    st.assign(lg[n] + 1, vector<int>(n));
    st[0] = a;
    for (int k = 1; k <= lg[n]; ++k) {
        for (int i = 0; i + (1 << k) <= n; ++i) {
            st[k][i] = min(st[k - 1][i], st[k - 1][i + (1 << (k - 1))]);
        }
    }
}

int query(int l, int r) {
    int k = lg[r - l + 1];
    return min(st[k][l], st[k][r - (1 << k) + 1]);
}

int main() {
    build({8, 7, 5, 2, 9, 4, 6, 3});
    cout << query(1, 6) << '\n';
}
```

运行结果

```text
2
```

## 5. STL 中的对应容器

STL 没有 ST 表容器。可以用 `vector<vector<int>>` 保存各层，用 `min` 合并，也可换成 `max`。维护 GCD 时，C++17 可用 `<numeric>` 中的 `gcd`。

## 6. 典型应用场景

### 6.1 典型用法

- 数组不修改，重复查询一段区间的最值或最大公约数。
- 求 LCA 时，在记录进入和回退过程的欧拉遍历中，找到两个结点首次出现位置之间深度最小的结点。

### 6.2 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 P3865 ST 表与 RMQ](https://www.luogu.com.cn/problem/P3865) | 把区间最小值模板改成区间最大值，统一题目和代码下标 |

## 7. 优点与局限性

ST 表把计算集中到预处理，适合查询多且没有修改的场景。额外空间随层数增长，精简每层合法起点可以减少常数。只求静态区间和，用前缀和能把空间降到 $O(n)$；需动态更新最值时改用线段树。
