---
title: "并查集（Disjoint Set Union）"
excerpt: "并查集的集合代表、路径压缩、按大小合并和简洁 C++ 示例。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

并查集（Disjoint Set Union）维护一组互不相交的集合，主要回答两个元素是否同集合，并可把两个集合合并。任选每棵树的根作为集合代表。

## 2. 结构与工作原理

### 2.1 父指针和查找根

初始每个元素自成集合，`parent[x]=x`。执行 `find_root(x)` 时沿父指针向上，直到 `parent[r]=r`。两个元素的根相同，就属于一个集合。

### 2.2 路径压缩

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

例如从 3 经过 2 找到根 1，返回前可以直接让 3 指向 1。路径缩短后，再查询这些结点时就能更快到达根。压缩只改变树形，集合的元素保持相同。

### 2.3 按大小合并

先查到两边的根。若根不同，把较小集合的根挂到较大集合上，再把大小相加。某个结点因挂接多一层时，它所在的集合至少翻倍。仅使用按大小合并就能把树高控制在 $O(\log n)$。

## 3. 基本操作及时间复杂度

| 操作 | 复杂度 |
| --- | --- |
| 初始化 `n` 个集合 | $O(n)$ |
| 查根、判断同集合 | 均摊 $O(\alpha(n))$ |
| 合并、查询集合大小 | 均摊 $O(\alpha(n))$ |
| 存储父结点和大小 | $O(n)$ 空间 |

$\alpha(n)$ 增长极慢。表中同时使用按大小合并和路径压缩，复杂度是对一串操作平均分摊的开销。

<aside class="ds-note" aria-label="大小只记在根上">
  <p><strong>大小只记在根上。</strong>合并后，被挂接的旧根不再代表整个集合。查询大小应读取 <code>sz[find_root(x)]</code>。</p>
</aside>

## 4. C++ 代码实现

`parent[x]` 存父结点，`sz[r]` 只保证在根 `r` 处记录正确的集合大小。下面从 0 开始编号。合并 0 与 1、1 与 2 后，0 和 2 同集合，集合大小为 3。

```cpp
#include <iostream>
#include <numeric>
#include <utility>
#include <vector>
using namespace std;

vector<int> parent, sz;

int find_root(int x) {
    if (parent[x] == x) return x;
    return parent[x] = find_root(parent[x]);
}

void unite(int a, int b) {
    a = find_root(a);
    b = find_root(b);
    if (a == b) return;
    if (sz[a] < sz[b]) swap(a, b);
    parent[b] = a;
    sz[a] += sz[b];
}

int main() {
    parent.resize(4);
    sz.assign(4, 1);
    iota(parent.begin(), parent.end(), 0);

    unite(0, 1);
    unite(1, 2);
    cout << (find_root(0) == find_root(2)) << '\n';
    cout << sz[find_root(0)] << '\n';
}
```

运行结果

```text
1
3
```

若还要维护连通块数，可把 `unite` 改为返回是否真正合并，只有合并了不同的根才将数量减 1。

## 5. STL 中的对应容器

STL 没有直接对应的并查集容器。用 `vector<int>` 保存父结点和大小，再用 `iota` 初始化每个元素的父结点。已经得到的根编号可能因下一次合并变化，需要比较时重新查找。

## 6. 典型应用场景

### 6.1 动态连通性与成环判断

无向图中加入一条边前，如果两端已连通，新边会和原来的一条路径形成环。

### 6.2 Kruskal 最小生成树

把边按权值从小到大处理，只选两端属于不同集合的边。选中一条就合并，直到用了 `n-1` 条边。

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

### 6.3 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 P3367 并查集](https://www.luogu.com.cn/problem/P3367) | 合并与连通性查询 |
| [洛谷 P3366 最小生成树](https://www.luogu.com.cn/problem/P3366) | 按边权排序，用并查集跳过成环边 |

## 7. 优点与局限性

并查集只保存集合归属，存储小，特别适合不断合并的场景。它不保存原图中的路径，删一条边也无法直接把集合拆开。仅有删边操作时，可考虑倒序转成加边；混合增删通常需要离线分治或可回滚并查集。
