---
title: "链表（Linked List）"
excerpt: "从节点的指针关系出发，讲解单向、双向和循环链表，并用 STL 实现 LRU。"
---

[← 返回数据结构总览](../)

## 1. 节点和指针

链表把元素拆成节点。知道头节点后，可以沿着 `next` 找到后继。节点在内存里可以分散存放，访问第 `k` 个元素时，要按顺序走到它。

### 单向、双向和循环

单向链表每个节点保存一个 `next`。双向链表还保存 `prev`，可以从当前位置向两侧移动。循环链表的尾节点连回开头，遍历时要记录起始节点或遍历次数。

<figure class="ds-figure">
  <svg role="img" aria-label="单向链表从 head 出发依次访问三个节点" font-family="-apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif" font-weight="430" fill="currentColor" viewBox="0 0 340 90" width="100%" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="24" width="70" height="36" rx="4" fill="#64748b" fill-opacity=".09" stroke="#8492a6"/>
    <rect x="59" y="24" width="26" height="36" rx="3" fill="#64748b" fill-opacity=".2" stroke="#8492a6"/>
    <text x="37" y="47" font-size="14" fill="currentColor" text-anchor="middle">10</text>
    <circle cx="72" cy="42" r="3" fill="#64748b"/>
    <path d="M72 42 H109 m-6 -4 l6 4 -6 4" fill="none" stroke="#64748b" stroke-width="1.5"/>
    <rect x="110" y="24" width="70" height="36" rx="4" fill="#64748b" fill-opacity=".09" stroke="#8492a6"/>
    <rect x="154" y="24" width="26" height="36" rx="3" fill="#64748b" fill-opacity=".2" stroke="#8492a6"/>
    <text x="132" y="47" font-size="14" fill="currentColor" text-anchor="middle">20</text>
    <circle cx="167" cy="42" r="3" fill="#64748b"/>
    <path d="M167 42 H204 m-6 -4 l6 4 -6 4" fill="none" stroke="#64748b" stroke-width="1.5"/>
    <rect x="205" y="24" width="70" height="36" rx="4" fill="#64748b" fill-opacity=".09" stroke="#8492a6"/>
    <rect x="249" y="24" width="26" height="36" rx="3" fill="#64748b" fill-opacity=".2" stroke="#8492a6"/>
    <text x="227" y="47" font-size="14" fill="currentColor" text-anchor="middle">30</text>
    <circle cx="262" cy="42" r="3" fill="#64748b"/>
    <path d="M262 42 H299 m-6 -4 l6 4 -6 4" fill="none" stroke="#64748b" stroke-width="1.5"/>
    <text x="302" y="46" font-size="11" fill="currentColor">NULL</text>
    <text x="15" y="16" font-size="11" fill="currentColor">head</text>
    <text x="37" y="76" font-size="10" fill="#8492a6" text-anchor="middle">data</text>
    <text x="72" y="76" font-size="10" fill="#8492a6" text-anchor="middle">next</text>
  </svg>
  <figcaption>指针从 head 开始依次连接 10、20、30，尾节点指向 NULL。</figcaption>
</figure>

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 94" role="img" aria-label="双向链表的 prev 与 next 指针" fill="currentColor">
    <rect x="64" y="25" width="76" height="43" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <path d="M83 25 L83 68" fill="none" stroke="currentColor" stroke-opacity=".38" stroke-width="1.5"/>
    <path d="M121 25 L121 68" fill="none" stroke="currentColor" stroke-opacity=".38" stroke-width="1.5"/>
    <text x="102" y="47" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">10</text>
    <circle cx="73.5" cy="54" r="2.5" fill="currentColor" opacity=".64"/>
    <circle cx="130.5" cy="39" r="2.5" fill="currentColor" opacity=".64"/>
    <rect x="182" y="25" width="76" height="43" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <path d="M201 25 L201 68" fill="none" stroke="currentColor" stroke-opacity=".38" stroke-width="1.5"/>
    <path d="M239 25 L239 68" fill="none" stroke="currentColor" stroke-opacity=".38" stroke-width="1.5"/>
    <text x="220" y="47" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">20</text>
    <circle cx="191.5" cy="54" r="2.5" fill="currentColor" opacity=".64"/>
    <circle cx="248.5" cy="39" r="2.5" fill="currentColor" opacity=".64"/>
    <rect x="300" y="25" width="76" height="43" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <path d="M319 25 L319 68" fill="none" stroke="currentColor" stroke-opacity=".38" stroke-width="1.5"/>
    <path d="M357 25 L357 68" fill="none" stroke="currentColor" stroke-opacity=".38" stroke-width="1.5"/>
    <text x="338" y="47" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">30</text>
    <circle cx="309.5" cy="54" r="2.5" fill="currentColor" opacity=".64"/>
    <circle cx="366.5" cy="39" r="2.5" fill="currentColor" opacity=".64"/>
    <path d="M131 39 L182 39" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M176.0 35.0 L182 39 L176.0 43.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M249 39 L300 39" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M294.0 35.0 L300 39 L294.0 43.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M366 39 L396 39" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M390.0 35.0 L396 39 L390.0 43.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M191 54 L140 54" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M146.0 58.0 L140 54 L146.0 50.0" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M309 54 L258 54" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M264.0 58.0 L258 54 L264.0 50.0" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M73 54 L43 54" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M49.0 58.0 L43 54 L49.0 50.0" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <text x="23" y="54" text-anchor="middle" dominant-baseline="middle" font-size="11" opacity=".76">NULL</text>
    <text x="416" y="39" text-anchor="middle" dominant-baseline="middle" font-size="11" opacity=".76">NULL</text>
    <text x="220" y="83" text-anchor="middle" dominant-baseline="middle" font-size="13">上排 next 向右 · 下排 prev 向左</text>
  </svg>
  <figcaption>每个节点同时记录前驱和后继。</figcaption>
</figure>

<figure class="ds-figure">
  <svg role="img" aria-label="循环链表尾节点指向头节点" font-family="-apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, sans-serif" font-weight="430" fill="currentColor" viewBox="0 0 340 100" width="100%" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="15" width="70" height="36" rx="4" fill="#64748b" fill-opacity=".09" stroke="#8492a6"/>
    <rect x="69" y="15" width="26" height="36" rx="3" fill="#64748b" fill-opacity=".2" stroke="#8492a6"/>
    <text x="47" y="38" font-size="14" fill="currentColor" text-anchor="middle">10</text>
    <circle cx="82" cy="33" r="3" fill="#64748b"/>
    <path d="M82 33 H134 m-6 -4 l6 4 -6 4" stroke="#64748b" fill="none" stroke-width="1.5"/>
    <rect x="135" y="15" width="70" height="36" rx="4" fill="#64748b" fill-opacity=".09" stroke="#8492a6"/>
    <rect x="179" y="15" width="26" height="36" rx="3" fill="#64748b" fill-opacity=".2" stroke="#8492a6"/>
    <text x="157" y="38" font-size="14" fill="currentColor" text-anchor="middle">20</text>
    <circle cx="192" cy="33" r="3" fill="#64748b"/>
    <path d="M192 33 H244 m-6 -4 l6 4 -6 4" stroke="#64748b" fill="none" stroke-width="1.5"/>
    <rect x="245" y="15" width="70" height="36" rx="4" fill="#64748b" fill-opacity=".09" stroke="#8492a6"/>
    <rect x="289" y="15" width="26" height="36" rx="3" fill="#64748b" fill-opacity=".2" stroke="#8492a6"/>
    <text x="267" y="38" font-size="14" fill="currentColor" text-anchor="middle">30</text>
    <circle cx="302" cy="33" r="3" fill="#64748b"/>
    <path d="M302 33 H328 V81 H12 V33 H25 m-6 -4 l6 4 -6 4" fill="none" stroke="#64748b" stroke-width="1.5"/>
  </svg>
  <figcaption>30 的指针连回 10，形成一个环。</figcaption>
</figure>

## 2. 插入和删除怎样改指针？

### 插入节点

假设 `A.next` 原本指向 `C`，要在两者之间插入 `B`。先把 `B.next` 指向 `C`，再让 `A.next` 指向 `B`。这样旧后继始终有引用。双向链表还要把 `B.prev` 设为 `A`，把 `C.prev` 改为 `B`。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 96" role="img" aria-label="在单向链表 A 与 C 之间插入 B" fill="currentColor">
    <text x="57" y="23" text-anchor="middle" dominant-baseline="middle" font-size="13" opacity=".76">插入前</text>
    <rect x="128" y="9" width="36" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="146" y="24" text-anchor="middle" dominant-baseline="middle" font-size="14">A</text>
    <rect x="276" y="9" width="36" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="294" y="24" text-anchor="middle" dominant-baseline="middle" font-size="14">C</text>
    <path d="M166 23 L274 23" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M268.0 19.0 L274 23 L268.0 27.0" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <text x="57" y="70" text-anchor="middle" dominant-baseline="middle" font-size="13" opacity=".76">插入后</text>
    <rect x="128" y="56" width="36" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="146" y="71" text-anchor="middle" dominant-baseline="middle" font-size="14">A</text>
    <rect x="202" y="56" width="36" height="28" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="220" y="71" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">B</text>
    <rect x="276" y="56" width="36" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="294" y="71" text-anchor="middle" dominant-baseline="middle" font-size="14">C</text>
    <path d="M166 70 L200 70" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M194.0 66.0 L200 70 L194.0 74.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M240 70 L274 70" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M268.0 66.0 L274 70 L268.0 74.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
  </svg>
  <figcaption>先令 B.next 指向 C，再令 A.next 指向 B。</figcaption>
</figure>

### 删除节点

对于 `A → B → C`，让 `A.next` 指向 `C` 就能跳过 `B`。如果用的是单向链表，仅知道 `B` 时一般还得查找它的前驱。用双向链表时，可以从 `B.prev` 直接取得前驱，并按同样方法修复 `C.prev`。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 96" role="img" aria-label="单向链表中 A 绕过 B 并指向 C" fill="currentColor">
    <text x="57" y="23" text-anchor="middle" dominant-baseline="middle" font-size="13" opacity=".76">删除前</text>
    <rect x="128" y="9" width="36" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="146" y="24" text-anchor="middle" dominant-baseline="middle" font-size="14">A</text>
    <rect x="202" y="9" width="36" height="28" rx="5" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="220" y="24" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">B</text>
    <rect x="276" y="9" width="36" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="294" y="24" text-anchor="middle" dominant-baseline="middle" font-size="14">C</text>
    <path d="M166 23 L200 23" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M194.0 19.0 L200 23 L194.0 27.0" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M240 23 L274 23" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M268.0 19.0 L274 23 L268.0 27.0" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <text x="57" y="70" text-anchor="middle" dominant-baseline="middle" font-size="13" opacity=".76">删除后</text>
    <rect x="128" y="56" width="36" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="146" y="71" text-anchor="middle" dominant-baseline="middle" font-size="14">A</text>
    <rect x="276" y="56" width="36" height="28" rx="5" fill="none" stroke="currentColor" stroke-opacity=".45"/>
    <text x="294" y="71" text-anchor="middle" dominant-baseline="middle" font-size="14">C</text>
    <path d="M166 70 L274 70" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M268.0 66.0 L274 70 L268.0 74.0" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
  </svg>
  <figcaption>知道 B 的前驱 A 后，让 A.next 直接指向 C。</figcaption>
</figure>

| 操作 | 时间复杂度 |
| --- | --- |
| 从头找第 `k` 个节点或查找某个值 | 最坏 $O(n)$ |
| 在已知节点后插入或删除其后继 | $O(1)$ |
| 在双向链表里删除迭代器指向的节点 | $O(1)$ |
| 遍历 | $O(n)$ |

## 3. STL 容器的用法

- `std::forward_list` 是单向链表。用 `before_begin()` 表示首元素的前驱，头插可以写成 `insert_after(before_begin(), x)`。
- `std::list` 是双向链表。`insert(it, x)` 在 `it` 前插入，`erase(it)` 删除当前元素并返回下一个迭代器。
- `list` 插入元素不会使原有节点的迭代器失效。删除后，指向被删节点的迭代器失效。遍历时删除可写成 `it = items.erase(it)`。
- `list::splice` 可以把节点移到链表中的另一处。移动同一链表的一个节点只需要改链接，被移动节点的迭代器仍可使用。

## 4. 操作示例：最近最少使用缓存

用 `list` 维护访问顺序，最新使用的节点在首部，最久未使用的节点在尾部。用 `unordered_map` 把键映射到链表迭代器，以便直接找到对应节点。

访问命中就把该节点移到首部。新节点插到首部，超出容量时删除尾部。例如容量为 2，依次写入 A、B，访问 A，再写入 C，最后留下 C、A，淘汰 B。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 158" role="img" aria-label="容量为 2 的 LRU 缓存访问顺序" fill="currentColor">
    <text x="166" y="11" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">最近使用</text>
    <text x="235" y="11" text-anchor="middle" dominant-baseline="middle" font-size="12" opacity=".72">最久未使用</text>
    <text x="14" y="37" text-anchor="start" dominant-baseline="middle" font-size="13">写入 A</text>
    <rect x="132" y="23" width="69" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="166.5" y="37.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">A</text>
    <rect x="201" y="23" width="69" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="235.5" y="37.5" text-anchor="middle" dominant-baseline="middle" font-size="14">空</text>
    <text x="14" y="69" text-anchor="start" dominant-baseline="middle" font-size="13">写入 B</text>
    <rect x="132" y="55" width="69" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="166.5" y="69.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">B</text>
    <rect x="201" y="55" width="69" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="235.5" y="69.5" text-anchor="middle" dominant-baseline="middle" font-size="14">A</text>
    <text x="14" y="101" text-anchor="start" dominant-baseline="middle" font-size="13">访问 A</text>
    <rect x="132" y="87" width="69" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="166.5" y="101.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">A</text>
    <rect x="201" y="87" width="69" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="235.5" y="101.5" text-anchor="middle" dominant-baseline="middle" font-size="14">B</text>
    <text x="14" y="133" text-anchor="start" dominant-baseline="middle" font-size="13">写入 C</text>
    <rect x="132" y="119" width="69" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="166.5" y="133.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">C</text>
    <rect x="201" y="119" width="69" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="235.5" y="133.5" text-anchor="middle" dominant-baseline="middle" font-size="14">A</text>
    <path d="M282 133 L313 133" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M307 129 L313 133 L307 137" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-width="1.6"/>
    <text x="353" y="133" text-anchor="middle" dominant-baseline="middle" font-size="13">淘汰 B</text>
  </svg>
  <figcaption>访问 A 后，B 变成最久未使用的项。C 加入时淘汰 B。</figcaption>
</figure>

```cpp
#include <list>
#include <optional>
#include <unordered_map>
#include <utility>

class LRUCache {
    using Items = std::list<std::pair<int, int>>;
    std::size_t capacity;
    Items items;
    std::unordered_map<int, Items::iterator> index;

public:
    explicit LRUCache(std::size_t n) : capacity(n) {}
    LRUCache(const LRUCache&) = delete;
    LRUCache& operator=(const LRUCache&) = delete;

    std::optional<int> get(int key) {
        auto it = index.find(key);
        if (it == index.end()) return std::nullopt;
        items.splice(items.begin(), items, it->second);
        return it->second->second;
    }

    void put(int key, int value) {
        if (capacity == 0) return;
        auto it = index.find(key);
        if (it != index.end()) {
            it->second->second = value;
            items.splice(items.begin(), items, it->second);
            return;
        }

        items.emplace_front(key, value);
        index.emplace(key, items.begin());
        if (items.size() > capacity) {
            index.erase(items.back().first);
            items.pop_back();
        }
    }
};
```

两种操作平均都是 $O(1)$，空间为 $O(\text{capacity})$。链表也适合在已知位置反复改接节点。若主要任务是遍历和按下标访问，数组和 `vector` 更自然。

## 5. 迭代器和边界

- `end()` 是尾后位置，可作为 `list::insert` 的插入点。它不能解引用或传给 `erase`。
- `forward_list::erase_after(it)` 删除的是 `it` 后面的节点，要求那个节点存在。若只保存当前节点，应考虑是否也要保存前驱。
- 在双向链表上做批量删除时，迭代器用 `erase(it)` 的返回值前进。继续对旧迭代器做 `++it` 会使用失效位置。
- 节点间缺少连续存储的局部性。为了频繁插入而选链表前，先看题目能否保留目标位置的迭代器，或能否直接用数组模拟前驱和后继下标。
