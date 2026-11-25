---
title: "并查集（Disjoint Set Union）"
excerpt: "解释集合代表、按大小合并和路径压缩，并给出 Kruskal 最小生成树实现。"
---

[← 返回数据结构总览](../)

## 1. 用一棵树表示一个集合

开始时每个元素自成一个集合，父节点是自己。两个元素沿父指针走到同一个根，就属于同一集合。合并两个集合时，只要修改其中一个根的父节点，原来连到它的所有节点就能走到新的根。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 139" role="img" aria-label="并查集对 3 执行 find 前后的父指针" fill="currentColor">
    <text x="100" y="11" text-anchor="middle" dominant-baseline="middle" font-size="13">查找前</text>
    <text x="331" y="11" text-anchor="middle" dominant-baseline="middle" font-size="13">路径压缩后</text>
    <path d="M100 68 L100 52" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M96.0 58.0 L100 52 L104.0 58.0" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M100 110 L100 94" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M96.0 100.0 L100 94 L104.0 100.0" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <circle cx="100" cy="39" r="12" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="100" y="40" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <circle cx="100" cy="81" r="12" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="100" y="82" text-anchor="middle" dominant-baseline="middle" font-size="14">2</text>
    <circle cx="100" cy="123" r="12" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="100" y="124" text-anchor="middle" dominant-baseline="middle" font-size="14">3</text>
    <path d="M294 96 L324 50" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M317.4 52.8 L324 50 L324.1 57.2" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M366 96 L337 50" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M336.8 57.2 L337 50 L343.6 52.9" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <circle cx="331" cy="39" r="12" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="331" y="40" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">1</text>
    <circle cx="287" cy="108" r="12" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="287" y="109" text-anchor="middle" dominant-baseline="middle" font-size="14">2</text>
    <circle cx="374" cy="108" r="12" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="374" y="109" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">3</text>
    <path d="M190 76 L248 76" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M242.0 72.0 L248 76 L242.0 80.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
  </svg>
  <figcaption>查找 3 时，沿 3 → 2 → 1 找到根，再让 3 直接指向 1。</figcaption>
</figure>

同一个集合的根可能随着合并改变。因此，保存过去某次 `find(x)` 的结果，只能表示那一刻的根。下一次使用时应重新查找。

## 2. 两种优化和基本操作

- **按大小合并。** 把小树的根接到大树的根上。某个节点每多一层深度，它所在的集合至少翻倍，单靠这项优化，树高就至多为 $O(\log n)$。
- **路径压缩。** 查到根后，让路径上的节点直接指向根。上图的 `3 → 2 → 1` 就缩成了 `3 → 1`。

| 操作 | 时间复杂度 |
| --- | --- |
| 初始化 | $O(n)$ |
| 查询集合代表、判断同集合 | 均摊 $O(\alpha(n))$ |
| 合并、查询集合大小 | 均摊 $O(\alpha(n))$ |

$\alpha(n)$ 增长很慢。大小只保存在根上，所以查集合大小前也要先调用 `find`。普通并查集适合加入关系，删除一条边后是否还连通则需要别的维护方法。

## 3. C++ 手写模板

```cpp
#include <numeric>
#include <utility>
#include <vector>

class DSU {
    std::vector<int> parent, size;

public:
    explicit DSU(int n) : parent(n), size(n, 1) {
        std::iota(parent.begin(), parent.end(), 0);
    }

    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);
        return parent[x];
    }

    bool unite(int a, int b) {
        a = find(a);
        b = find(b);
        if (a == b) return false;
        if (size[a] < size[b]) std::swap(a, b);
        parent[b] = a;
        size[a] += size[b];
        return true;
    }

    int component_size(int x) {
        return size[find(x)];
    }
};
```

`unite` 返回 `false` 表示两个点原来就在同一集合。维护连通块数量时，可以在返回 `true` 时将数量减一。顶点编号是 `0` 到 `n-1`。

## 4. 操作示例：选边连接所有顶点

Kruskal 将边按权值从小到大排序。遇到一条连接不同连通块的边时加入它，直到选了 `n-1` 条边。如果两端已经连通，再加这条边就会构成环。

例如边 `AB = 1、BC = 2、AC = 3、CD = 4`。选择 AB、BC 后，A 和 C 已在同一集合，于是跳过 AC，再加入 CD，总权值为 7。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 142" role="img" aria-label="Kruskal 跳过同一连通块中的边" fill="currentColor">
    <path d="M88 35 L172 35" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M184 47 L184 91" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M86 41 L174 97" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4" stroke-dasharray="4 4"/>
    <path d="M196 103 L336 103" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <circle cx="76" cy="35" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="76" y="36" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">A</text>
    <circle cx="184" cy="35" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="184" y="36" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">B</text>
    <circle cx="184" cy="103" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="184" y="104" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">C</text>
    <circle cx="348" cy="103" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="348" y="104" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">D</text>
    <text x="130" y="22" text-anchor="middle" dominant-baseline="middle" font-size="13">1</text>
    <text x="198" y="69" text-anchor="middle" dominant-baseline="middle" font-size="13">2</text>
    <text x="117" y="84" text-anchor="middle" dominant-baseline="middle" font-size="13">3 跳过</text>
    <text x="266" y="91" text-anchor="middle" dominant-baseline="middle" font-size="13">4</text>
  </svg>
  <figcaption>加入权为 1 和 2 的边后，A 与 C 已连通。跳过虚线边，再用权为 4 的边接入 D。</figcaption>
</figure>

```cpp
#include <algorithm>
#include <optional>
#include <vector>

struct Edge {
    int u, v;
    long long weight;
};

// 使用上面的 DSU。n >= 1，所有端点都在 [0, n) 内。
std::optional<long long> kruskal(int n, std::vector<Edge> edges) {
    std::sort(edges.begin(), edges.end(), [](const Edge& a, const Edge& b) {
        return a.weight < b.weight;
    });

    DSU dsu(n);
    long long total = 0;
    int used = 0;
    for (const auto& e : edges) {
        if (!dsu.unite(e.u, e.v)) continue;
        total += e.weight;
        if (++used == n - 1) break;
    }
    if (used == n - 1) return total;
    return std::nullopt;
}
```

总时间为 $O(n + m\log(m+1) + m\alpha(n))$，主要步骤是初始化和给 $m$ 条边排序。返回空值表示原图不连通。

## 5. 可维护的信息和变式

- **连通块大小、最小编号和总权值。** 在根上维护统计量，仅在两个不同集合合并时合并统计结果。路径压缩只改变父指针，不改变这些集合统计量。
- **等价关系和异或关系。** 等价关系可直接合并。若还要知道两点的相对关系，例如它们在二分图中是否同色，可用带权并查集保存相对父节点的值，并在找根时同步更新。
- **离线删除与回滚。** 若操作只删边、查询连通性，倒序处理就能把删除改成加边。若同时有增删，常见的离线做法是按时间组织边的有效区间，用可回滚并查集撤销合并。回滚版本通常保留按大小合并，省去会批量改父指针的路径压缩。

<aside class="ds-note" aria-label="适用范围">
  <p><strong>适用范围。</strong>并查集回答无向连通性或等价关系，不能从父指针恢复原图的一条路径，也不能直接判断有向图的可达性。</p>
</aside>
