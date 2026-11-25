---
title: "平衡树（Balanced Search Tree）"
excerpt: "平衡搜索树如何用旋转控制高度，以及 set、multiset 和 map 的用法。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

平衡搜索树（Balanced Search Tree）在维持键的顺序时限制树高。普通 BST 在极端情况下会变成一条链，平衡搜索树通过旋转等局部调整，把搜索路径控制在 $O(\log n)$ 层。AVL 树和红黑树是常见的两类。

## 2. 结构与工作原理

### 2.1 AVL 的平衡条件

AVL 树要求每个结点的左右子树高度差绝对值不超过 1。依次插入 30、20、10 后，30 的左侧过高。以 30 为中心右旋，20 成为新根，10、30 分别位于两侧。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 137" role="img" aria-label="AVL 树对 30 执行一次右旋" fill="currentColor">
    <text x="110" y="12" text-anchor="middle" dominant-baseline="middle" font-size="13">右旋前</text>
    <text x="331" y="12" text-anchor="middle" dominant-baseline="middle" font-size="13">右旋后</text>
    <path d="M133 52 L114 66" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M92 87 L73 101" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <circle cx="144" cy="41" r="14" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="144" y="42" text-anchor="middle" dominant-baseline="middle" font-size="14">30</text>
    <circle cx="103" cy="76" r="14" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="103" y="77" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">20</text>
    <circle cx="62" cy="111" r="14" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="62" y="112" text-anchor="middle" dominant-baseline="middle" font-size="14">10</text>
    <path d="M315 52 L286 76" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M338 52 L367 76" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <circle cx="327" cy="41" r="14" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="327" y="42" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">20</text>
    <circle cx="275" cy="86" r="14" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="275" y="87" text-anchor="middle" dominant-baseline="middle" font-size="14">10</text>
    <circle cx="378" cy="86" r="14" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="378" y="87" text-anchor="middle" dominant-baseline="middle" font-size="14">30</text>
    <path d="M180 69 L238 69" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M232.0 65.0 L238 69 L232.0 73.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
  </svg>
  <figcaption>20 成为新根，中序顺序仍是 10、20、30。</figcaption>
</figure>

一般的右旋还要把 20 原来的右子树接给 30 的左侧。这些键在 20 和 30 之间。旋转前后，整棵子树的中序顺序一致。

### 2.2 单旋与双旋

| 失衡方向 | 高子树倾斜方向 | 处理方法 |
| --- | --- | --- |
| 左 | 左 | 对失衡结点右旋 |
| 右 | 右 | 对失衡结点左旋 |
| 左 | 右 | 左孩子先左旋，失衡结点再右旋 |
| 右 | 左 | 右孩子先右旋，失衡结点再左旋 |

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 136" role="img" aria-label="AVL 左右型失衡经过两次旋转得到平衡" fill="currentColor">
    <text x="75" y="12" text-anchor="middle" dominant-baseline="middle" font-size="13">插入 20 后</text>
    <text x="218" y="12" text-anchor="middle" dominant-baseline="middle" font-size="13">对 10 左旋</text>
    <text x="365" y="12" text-anchor="middle" dominant-baseline="middle" font-size="13">对 30 右旋</text>
    <path d="M82 48 L57 71" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <path d="M56 88 L72 104" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <circle cx="91" cy="40" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="91" y="41" text-anchor="middle" dominant-baseline="middle" font-size="12">30</text>
    <circle cx="48" cy="79" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="48" y="80" text-anchor="middle" dominant-baseline="middle" font-size="12">10</text>
    <circle cx="80" cy="113" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="80" y="114" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700">20</text>
    <path d="M112 65 L150 65" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M144 61 L150 65 L144 69" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-width="1.6"/>
    <path d="M226 50 L215 69" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M201 88 L186 104" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <circle cx="232" cy="40" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="232" y="41" text-anchor="middle" dominant-baseline="middle" font-size="12">30</text>
    <circle cx="209" cy="79" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="209" y="80" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700">20</text>
    <circle cx="178" cy="113" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="178" y="114" text-anchor="middle" dominant-baseline="middle" font-size="12">10</text>
    <path d="M253 65 L291 65" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M285 61 L291 65 L285 69" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-width="1.6"/>
    <path d="M356 49 L337 70" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <path d="M372 49 L391 70" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <circle cx="364" cy="40" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="364" y="41" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700">20</text>
    <circle cx="329" cy="79" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="329" y="80" text-anchor="middle" dominant-baseline="middle" font-size="12">10</text>
    <circle cx="399" cy="79" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="399" y="80" text-anchor="middle" dominant-baseline="middle" font-size="12">30</text>
  </svg>
  <figcaption>两个旋转前后的中序顺序都是 10、20、30，最终由 20 作为子树的根。</figcaption>
</figure>

### 2.3 红黑树怎样约束树高？

红黑树用颜色规则控制高度。例如红结点不能再有红孩子，从同一个结点向任意空叶子走，路径上经过的黑结点数相同。更新时可通过重新着色和旋转恢复性质。

## 3. 基本操作及时间复杂度

| 操作 | `set` 常用接口 | 时间复杂度 |
| --- | --- | --- |
| 查找、插入单个键 | `find(x)`、`insert(x)` | $O(\log n)$ |
| 按键删除 | `erase(x)` | $O(\log n)$ |
| 查第一个键 $\ge x$ 或 $>x$ | `lower_bound(x)`、`upper_bound(x)` | $O(\log n)$ |
| 按序遍历全部键 | 迭代器从 `begin()` 到 `end()` | $O(n)$ |

存 `n` 个结点需要 $O(n)$ 空间。若在 `multiset` 用键删除 `k` 个相等元素，总耗时为 $O(\log n+k)$。

<aside class="ds-note" aria-label="排名查询">
  <p><strong>排名查询。</strong><code>set</code> 的迭代器是双向迭代器。从 <code>begin()</code> 到目标位置逐步计数，最坏要走线性步数。</p>
</aside>

## 4. C++ 代码实现

### 4.1 查询最接近的键

有序集合中离 `x` 最近的值，只可能是 `lower_bound(x)` 返回的键和它的前驱。下面的示例约定集合非空，距离相同则取较小的值。查询本身为 $O(\log n)$。

```cpp
#include <iostream>
#include <iterator>
#include <set>
using namespace std;

int main() {
    set<int> s = {4, 11, 18};
    int x = 15;

    auto hi = s.lower_bound(x);
    if (hi == s.begin()) {
        cout << *hi << '\n';
    } else if (hi == s.end()) {
        cout << *s.rbegin() << '\n';
    } else {
        auto lo = prev(hi);
        long long left = (long long)x - *lo;
        long long right = (long long)*hi - x;
        cout << (left <= right ? *lo : *hi) << '\n';
    }
}
```

运行结果

```text
18
```

## 5. STL 中的对应容器

| 容器 | 头文件 | 用途 |
| --- | --- | --- |
| `set`、`multiset` | `<set>` | 有序键，分别去重和保留重复 |
| `map`、`multimap` | `<map>` | 按键存值，分别使用唯一键和重复键 |

标准规定的是接口和复杂度，实现通常采用红黑树。`ms.erase(x)` 删除所有相等元素。只删一个时用 `find(x)` 找到迭代器，再调用 `erase(it)`。

```cpp
#include <iostream>
#include <set>
using namespace std;

int main() {
    set<int> s = {10, 20, 30};
    s.insert(25);

    auto it = s.lower_bound(21);
    if (it != s.end()) cout << *it << '\n';

    s.erase(20);
    for (int x : s) cout << x << ' ';
    cout << '\n';
}
```

运行结果

```text
25
10 25 30
```

## 6. 典型应用场景

### 6.1 典型用法

动态查前驱、后继或区间端点，也常用于扫描线活动集合。若需要排名或第 `k` 小，要给树维护子树大小，或在离散值域上用树状数组、线段树维护频次。

### 6.2 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 P5250 木材仓库](https://www.luogu.com.cn/problem/P5250) | 在有序集合中比较前驱、后继和目标距离 |
| [洛谷 P3369 普通平衡树](https://www.luogu.com.cn/problem/P3369) | 动态排名和第 k 小，需要维护子树规模等额外信息 |

## 7. 优点与局限性

平衡树适合动态有序集合。顺序查找比线性遍历快，且复杂度不会随插入顺序退化。若只查询键是否存在且不需要排序，哈希表更直接。
