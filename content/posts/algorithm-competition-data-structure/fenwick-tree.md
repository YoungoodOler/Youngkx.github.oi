---
title: "树状数组（Fenwick Tree）"
excerpt: "解释 lowbit 与前缀分块，提供线性建树、动态区间和及逆序对做法。"
---

[← 返回数据结构总览](../)

## 1. 每格存哪一段？

内部下标从 1 起。`lowbit(i) = i & -i` 是 `i` 的最低二进制 1 对应的值。`bit[i]` 记录闭区间 `[i - lowbit(i) + 1, i]` 的和。例如 `bit[6]` 对应 5 到 6，因为 `6` 的二进制是 `110`，最低的 1 在第 1 位，区间长度为 2。

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

查询前 7 项时，先取覆盖第 7 项的 `bit[7]`，剩下前 6 项。再取 `bit[6]`，剩下前 4 项。最后取 `bit[4]`，三段相邻且无重叠。每次从 `i` 减去 `lowbit(i)`，就是把这个块从前缀里剥掉。

## 2. 修改如何找到所有受影响的块？

内部位置 `i` 改变时，先更新 `bit[i]`，再令 `i += lowbit(i)`，更新包含它的更大块，直到超过数组末尾。例如长度为 8 时，修改内部下标 3 会更新 `bit[3]、bit[4]、bit[8]`。它们分别覆盖 `[3,3]`、`[1,4]`、`[1,8]`。

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

| 操作 | 时间复杂度 |
| --- | --- |
| 从原数组线性建树 | $O(n)$ |
| 单点加上增量 | $O(\log n)$ |
| 查询前缀和、区间和 | $O(\log n)$ |
| 空间 | $O(n)$ |

区间和是两个前缀和之差。若要把单点设为新值，可以保存当前元素，转成一次「新值减旧值」的增量。对外用 0 起始下标，写入前先转换成 `i + 1`，可避免把内部位置 0 放进更新循环。

## 3. C++ 模板

下面的模板对外统一使用半开区间。`prefix(end)` 求 `[0, end)` 的和。线性建树时，从小往大扫，把已经合成的块交给它的父块。

```cpp
#include <vector>

class Fenwick {
    int n;
    std::vector<long long> bit;

public:
    explicit Fenwick(int n) : n(n), bit(n + 1, 0) {}

    explicit Fenwick(const std::vector<long long>& a)
        : Fenwick(static_cast<int>(a.size())) {
        for (int i = 1; i <= n; ++i) {
            bit[i] += a[i - 1];
            int parent = i + (i & -i);
            if (parent <= n) bit[parent] += bit[i];
        }
    }

    void add(int i, long long delta) {
        for (int p = i + 1; p <= n; p += p & -p) bit[p] += delta;
    }

    long long prefix(int end) const {
        long long ans = 0;
        for (int p = end; p > 0; p -= p & -p) ans += bit[p];
        return ans;
    }

    long long sum(int l, int r) const {
        return prefix(r) - prefix(l);
    }
};
```

## 4. 操作示例：统计逆序对

逆序对为 `i < j` 且 `a[i] > a[j]`。从右向左扫描，每次在树状数组中查询已经出现的、严格小于当前值的数量。数值可能很大或为负数，先排序去重，把每个值映射到自己的秩。相同的值映射到同一个秩。

```cpp
#include <algorithm>
#include <vector>

// 使用上面的 Fenwick。
long long count_inversions(const std::vector<int>& a) {
    std::vector<int> keys = a;
    std::sort(keys.begin(), keys.end());
    keys.erase(std::unique(keys.begin(), keys.end()), keys.end());

    Fenwick seen(static_cast<int>(keys.size()));
    long long ans = 0;
    for (auto it = a.rbegin(); it != a.rend(); ++it) {
        int rank = static_cast<int>(
            std::lower_bound(keys.begin(), keys.end(), *it) - keys.begin());
        ans += seen.prefix(rank);
        seen.add(rank, 1);
    }
    return ans;
}
```

例如 `[3, 1, 1, 2]` 有 3 个逆序对，均由最左边的 3 形成。`prefix(rank)` 排除相同秩，所以两个 1 不会互相计数。离散化和扫描的总时间为 $O(n\log n)$，空间为 $O(n)$。

## 5. 扩展用法

- **区间加、单点查。** 在差分数组上维护树状数组。对 `[l, r)` 加 `x`，在 `l` 加 `x`，若 `r < n` 则在 `r` 减 `x`。查询位置 `i` 时累加到 `i`。
- **按频次找第 k 小。** 频次非负时，前缀和单调。可以二分前缀和，也可以在树状数组的块上按二进制位查找。
- **区间最值和任意单点赋值。** 最值无法像和一样用两个前缀相减，通常直接使用线段树。

区间加和区间求和可以用两棵树状数组。设 $d_i$ 是从 0 开始编号的差分。前 `end` 项的和等于 $\sum_{i<end}(end-i)d_i$，因为新增量 $d_i$ 会影响位置 `i` 到 `end-1`。两棵树分别维护 $d_i$ 和 $i d_i$，就可以把这一式子拆成两个前缀查询。

<aside class="ds-note" aria-label="下标检查">
  <p><strong>接口边界。</strong>写入使用 0 ≤ i &lt; n。前缀终点可取 0 或 n，空前缀和为 0。维护总和或逆序对数量时，节点和值域统计可能大于 32 位整数范围。</p>
</aside>
