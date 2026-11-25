---
title: "平衡树（Balanced Search Tree）"
excerpt: "讲解 AVL、红黑树的平衡思路与旋转，以及 set、multiset、map 的常用操作。"
---

[← 返回数据结构总览](../)

## 1. 平衡维护的是树高

动态有序集合希望每次沿树高找键都只走 $O(\log n)$ 层。AVL 树要求每个节点左右子树的高度差至多为 1。红黑树用颜色约束限制最长和最短路径的差距。两者都用旋转调整局部结构，旋转前后的中序顺序相同。

### 一次旋转移动了什么？

如果连续插入 30、20、10，AVL 树在 30 处失衡。右旋让 20 成为这棵子树的新根，30 成为 20 的右孩子。原先 20 的右子树也要接到 30 的左边，因为这部分键大于 20、小于 30。

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

左旋与之对称。若较高的孩子自身向相反的方向倾斜，例如插入顺序是 30、10、20，先对孩子 10 左旋，再对 30 右旋。重新计算高度或子树大小时，应先更新位置较低的旧根，再更新新根。

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

## 2. 操作和复杂度

| 操作 | C++ 接口 | 时间复杂度 |
| --- | --- | --- |
| 查找精确键 | `find(x)` | $O(\log n)$ |
| 找第一个键 $y\ge x$ | `lower_bound(x)` | $O(\log n)$ |
| 找第一个键 $y>x$ | `upper_bound(x)` | $O(\log n)$ |
| 插入一个键 | `insert(x)` | $O(\log n)$ |
| 按键删除 | `erase(x)` | $O(\log n+k)$，$k$ 是删掉的数量 |
| 已知迭代器时删除单项 | `erase(it)` | 均摊 $O(1)$ |
| 按顺序遍历 | 从 `begin()` 走到 `end()` | $O(n)$ |

要找严格小于 `x` 的前驱，先取得 `lower_bound(x)`，若返回的迭代器不等于 `begin()`，就向前退一步。要找严格大于 `x` 的后继，直接用 `upper_bound(x)` 并检查是否到了 `end()`。

## 3. C++ 有序容器

| 容器 | 键允许重复 | 适用情况 |
| --- | --- | --- |
| `std::set` | 否 | 动态有序集合 |
| `std::multiset` | 是 | 维护有重复值的有序集合 |
| `std::map` | 否 | 按键查值并保持键有序 |
| `std::multimap` | 是 | 一个键关联多个独立值 |

有序关联容器通常以红黑树实现，C++ 标准保证的是接口与复杂度。如果需要删除 `multiset` 中一个等于 `x` 的值，用 `find` 取得迭代器后调用 `erase(it)`。直接 `erase(x)` 会删掉全部相等项。对 `set` 调用 `distance(s.begin(), it)` 需要逐步移动迭代器，因此不能用它实现对数时间的排名查询。 [C++ 标准工作草案](https://eel.is/c++draft/associative.reqmts)

## 4. 操作示例：动态找离 x 最近的值

将候选键排序后，离 `x` 最近的键只可能是 `lower_bound(x)` 与它的前驱。更左侧的元素不小于前驱的距离，更右侧的元素不小于后继的距离。下面在距离相同时选择较小的键，空集合返回空值。

```cpp
#include <iterator>
#include <optional>
#include <set>

std::optional<int> nearest(const std::set<int>& s, int x) {
    if (s.empty()) return std::nullopt;
    auto hi = s.lower_bound(x);
    if (hi == s.begin()) return *hi;

    auto lo = std::prev(hi);
    if (hi == s.end()) return *lo;

    long long left = static_cast<long long>(x) - *lo;
    long long right = static_cast<long long>(*hi) - x;
    return left <= right ? *lo : *hi;
}
```

例如集合 `{4, 11, 18}` 查询 15 时，候选为 11 和 18，分别相距 4 和 3，因此返回 18。动态增删和单次查询各为 $O(\log n)$。若还需要按值查第 $k$ 小，可维护带子树大小的平衡搜索树，或在已知离散值域上用树状数组、线段树维护频次。

## 5. 旋转速查和比较规则

| AVL 插入后高的一侧 | 高子树自身的方向 | 修复方式 |
| --- | --- | --- |
| 左 | 左 | 对失衡节点右旋 |
| 右 | 右 | 对失衡节点左旋 |
| 左 | 右 | 对左孩子左旋，再对失衡节点右旋 |
| 右 | 左 | 对右孩子右旋，再对失衡节点左旋 |

红黑树通过另一套条件控制高度。例如红节点不能有红孩子，且从同一节点到各空叶子的路径包含相同数量的黑节点。修改后可能需要重新着色并配合旋转。使用 STL 时无需手动维护这些规则。

<aside class="ds-note" aria-label="比较规则">
  <p><strong>比较器。</strong>有序容器通过比较器判断两个键是否等价。若 comp(a,b) 和 comp(b,a) 都为假，容器就把两者视为等价。比较器要用严格顺序，例如升序用小于，不能用小于等于。</p>
</aside>
