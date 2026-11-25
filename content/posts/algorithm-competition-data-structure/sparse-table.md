---
title: "ST 表（Sparse Table）"
excerpt: "讲解静态区间查询的倍增预处理、重叠查询条件与区间最小值模板。"
---

[← 返回数据结构总览](../)

## 1. 先把固定长度的区间算好

若数组建好后不修改，可以先存下很多查询结果。ST 表选取长度 `1、2、4、8、…`，对每种长度记录每个合法起点的答案。定义 `st[k][i]` 为从 `i` 开始、长度为 $2^k$ 的区间最小值。长度为 1 时，`st[0][i] = a[i]`。

长度为 $2^k$ 的区间可以分成两个长度为 $2^{k-1}$ 的区间。左右一半的起点分别是 $i$ 和 $i+2^{k-1}$，所以有递推式

$$
st[k][i]=\min(st[k-1][i],\,st[k-1][i+2^{k-1}]).
$$

每一层依赖上一层，按长度从短到长计算。

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

## 2. 一次查询为什么只取两段？

对闭区间 `[l, r]`，取不超过长度 $r-l+1$ 的最大二次幂 $2^k$。从左端取长度 $2^k$ 的块，从右端取同样长度的块。它们一起覆盖询问区间，且都没有越过边界。

设总长为 $L$。由于 $2^k\le L<2^{k+1}$，两块都放得下，而且长度之和大于 $L$，所以中间没有空隙。当 $L$ 本身就是二次幂时，两块完全相同。重叠查询要求合并有结合律，而且对相同信息重复合并结果不变。

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

比如询问 `[1, 6]`，长度为 6。取 `[1, 4]` 和 `[3, 6]`，重叠下标 3、4。重复拿同一个元素参与 `min` 不影响答案。同理，`max`、`gcd` 和按位与也适合这种查法。求和时重叠元素会被多算。

| 操作 | 复杂度 | 备注 |
| --- | --- | --- |
| 预处理 | $O(n\log n)$ | 先算整数对数，再逐层递推 |
| 查询区间 | $O(1)$ | `lg[len]` 直接给出层数 |
| 空间 | $O(n\log n)$ | 每层只存合法起点 |
| 更新某个元素 | 通常重新建表 | 频繁更新用其他结构 |

## 3. C++ 区间最小值模板

```cpp
#include <algorithm>
#include <vector>

class SparseMin {
    std::vector<int> lg;
    std::vector<std::vector<int>> st;

public:
    explicit SparseMin(const std::vector<int>& a) : lg(a.size() + 1) {
        int n = static_cast<int>(a.size());
        if (n == 0) return;
        for (int len = 2; len <= n; ++len) lg[len] = lg[len / 2] + 1;

        st.push_back(a);
        for (int k = 1; k <= lg[n]; ++k) {
            int len = 1 << k;
            int half = len / 2;
            st.emplace_back(n - len + 1);
            for (int i = 0; i + len <= n; ++i) {
                st[k][i] = std::min(st[k - 1][i], st[k - 1][i + half]);
            }
        }
    }

    int query(int l, int r) const {
        int k = lg[r - l + 1];
        return std::min(st[k][l], st[k][r - (1 << k) + 1]);
    }
};
```

上面的查询使用从 0 开始的闭区间 `[l, r]`，要求 `0 <= l <= r < n`。若调用方使用半开区间 `[l, r)`，需要先确认非空，再调用 `query(l, r - 1)`。使用整数对数表，避免在恰好达到二次幂的位置受到浮点舍入影响。

## 4. 典型用途和选型

- **静态 RMQ。** 数组固定且区间最值询问很多时，把计算放到预处理里，每次只读两格。
- **静态区间 GCD。** 把递推和查询中的 `min` 换成 `std::gcd`，其头文件为 `<numeric>`。复杂度表把合并视为一次操作。
- **LCA。** 对树做记录返回过程的欧拉遍历，保存每次访问的节点及其深度。两节点首次出现位置之间，深度最小的节点是其最近公共祖先。表中要记录最小深度对应的节点，而非只存深度。
- **静态区间和。** 优先考虑前缀和，只需 $O(n)$ 预处理和空间，查询也是 $O(1)$。

## 5. 区间和内存边界

若只满足结合律，仍可以把询问拆成互不重叠的二次幂块，从左到右合并，需 $O(\log n)$ 次读取。这个办法适用于重复计入会改变结果的操作。

通常内存超过时间先成为限制。固定存满 `(lg[n]+1) * n` 格的写法易于定位，第 `k` 层尾部却有未使用的位置。按实际起点数分配每层能省掉这些空位，渐进空间仍是 $O(n\log n)$。
