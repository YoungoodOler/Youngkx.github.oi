---
title: "线段树（Segment Tree）"
excerpt: "讲解区间拆分、合并规则与懒标记，给出区间加和区间求和模板。"
---

[← 返回数据结构总览](../)

## 1. 节点负责一个区间

线段树从整个区间开始递归二分。对半开区间 `[l, r)`，令 `m = l + (r - l) / 2`，两个孩子分别管 `[l, m)` 和 `[m, r)`。当 `r - l = 1` 时，节点对应一个原数组元素。

如果维护区间和，父节点存左边的和加上右边的和。维护最值时，改为对两个孩子取最值。合并规则要有结合律。如果查询范围只包含部分孩子，要选与合并规则匹配的空结果，例如求和的空区间是 0，求最小值的空区间可用足够大的初始值。

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

图里查询 `[1, 4)` 时，`[2, 4)` 整段在查询范围里，可以直接读它保存的结果。`[0, 2)` 只与查询部分相交，需要继续往下走。最后把 `[1, 2)` 和 `[2, 4)` 的结果合并。

## 2. 基本操作和复杂度

| 操作 | 做法 | 时间复杂度 |
| --- | --- | --- |
| 建树 | 叶子读原值，父节点合并孩子 | $O(n)$ |
| 单点修改 | 沿根到叶修改，再逐层合并 | $O(\log n)$ |
| 区间查询 | 整段命中直接返回，部分命中继续分治 | $O(\log n)$ |
| 区间加 | 整段命中先更新节点并记懒标记 | $O(\log n)$ |
| 空间 | 保存各区间及所需标记 | $O(n)$ |

区间查询每一层至多有两个节点需要继续分解，分别位于询问区间的两个边界。完全被覆盖的节点直接提供结果，于是总访问量与树高同阶。

## 3. 懒标记保存什么？

若长度为 `len` 的区间整段加 `x`，区间和立即增加 `len * x`。暂时无需改两个孩子，可以把 `x` 累到当前节点的标记里。孩子的值在需要访问它们之前再更新，这一步叫下传。

例如 `[0, 4)` 的初始值为 `[1, 2, 3, 4]`。整段加 5 后，根的和从 10 变成 30。随后查询 `[1, 3)` 时，跨过根向下访问前要先把 +5 下传，结果是 `7 + 8 = 15`。

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

## 4. C++ 区间加与区间和模板

下面用 `tree[p]` 存节点区间和，用 `lazy[p]` 存已计入当前节点但尚未传给孩子的增量。对外传入合法的半开区间 `[l, r)`。

```cpp
#include <vector>

class LazySumTree {
    int n;
    std::vector<long long> tree, lazy;

    void build(int p, int l, int r, const std::vector<long long>& a) {
        if (r - l == 1) {
            tree[p] = a[l];
            return;
        }
        int m = l + (r - l) / 2;
        build(2 * p, l, m, a);
        build(2 * p + 1, m, r, a);
        pull(p);
    }

    void pull(int p) {
        tree[p] = tree[2 * p] + tree[2 * p + 1];
    }

    void apply(int p, int len, long long delta) {
        tree[p] += len * delta;
        lazy[p] += delta;
    }

    void push(int p, int l, int r) {
        if (lazy[p] == 0 || r - l == 1) return;
        int m = l + (r - l) / 2;
        apply(2 * p, m - l, lazy[p]);
        apply(2 * p + 1, r - m, lazy[p]);
        lazy[p] = 0;
    }

    void add(int p, int l, int r, int ql, int qr, long long delta) {
        if (qr <= l || r <= ql) return;
        if (ql <= l && r <= qr) {
            apply(p, r - l, delta);
            return;
        }
        push(p, l, r);
        int m = l + (r - l) / 2;
        add(2 * p, l, m, ql, qr, delta);
        add(2 * p + 1, m, r, ql, qr, delta);
        pull(p);
    }

    long long sum(int p, int l, int r, int ql, int qr) {
        if (qr <= l || r <= ql) return 0;
        if (ql <= l && r <= qr) return tree[p];

        push(p, l, r);
        int m = l + (r - l) / 2;
        return sum(2 * p, l, m, ql, qr) + sum(2 * p + 1, m, r, ql, qr);
    }

public:
    explicit LazySumTree(const std::vector<long long>& a)
        : n(static_cast<int>(a.size())), tree(4 * a.size()), lazy(4 * a.size()) {
        if (n > 0) build(1, 0, n, a);
    }

    void add(int l, int r, long long delta) {
        if (l < r) add(1, 0, n, l, r, delta);
    }

    long long sum(int l, int r) {
        return l < r ? sum(1, 0, n, l, r) : 0;
    }
};
```

## 5. 应用和扩展

- **动态区间最值。** 当修改只发生在单点时，沿一条分支更新节点，合并规则改为 `min` 或 `max`，不需要懒标记。
- **区间赋值。** 赋值标记覆盖更早的赋值。若同时支持加法和赋值，要根据时间顺序组合标记，并用独立的标志区分「尚无赋值」和「赋值为 0」。
- **树上二分。** 数组元素非负时，可以用左子树的和判断第一个达到目标前缀和的位置在哪个孩子。元素为负时，单靠区间和无法作这一判断。
- **选型。** 数组不改时，静态区间最值可用 ST 表。只维护加法和前缀或区间和时，树状数组通常更短。需要同时支持整段修改和更一般的区间信息时，再用线段树。

## 6. 模板检查

| 情况 | 处理方式 |
| --- | --- |
| 两个区间无交集 | 求和返回 0。更新时直接结束 |
| 节点区间被完整覆盖 | 直接返回节点和，或整段应用标记 |
| 节点区间只被部分覆盖 | 先下传标记，再访问孩子 |
| 递归修改了孩子 | 回到父节点后重新合并 |
| 合并与顺序有关 | 按左区间在前、右区间在后进行合并 |

<aside class="ds-note" aria-label="懒标记检查">
  <p><strong>标记和区间值。</strong>标记的增量已经计入当前节点，查询整段时直接返回区间值。只有向下访问孩子时才把标记分发给它们，否则容易重复累计。</p>
</aside>
