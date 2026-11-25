---
title: "二叉搜索树（Binary Search Tree）"
excerpt: "讲解全子树有序约束、中序遍历、前驱后继和三种删除情况。"
---

[← 返回数据结构总览](../)

## 1. 搜索树维护什么？

对每个节点 $x$，它左子树的**所有**键小于 $x$，右子树的**所有**键大于 $x$。下面按集合处理，相同键只存一次。若题目需要保留重复键，可以给节点加计数，或者给键加第二维编号。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 138" role="img" aria-label="二叉搜索树查找键 6 的路径" fill="currentColor">
    <path d="M207 34 L154 59" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M233 34 L286 59" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M132 78 L87 104" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M153 78 L195 104" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M309 78 L355 104" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <circle cx="220" cy="25" r="15" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="220" y="26" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">8</text>
    <circle cx="142" cy="69" r="15" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="142" y="70" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">3</text>
    <circle cx="298" cy="69" r="15" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="298" y="70" text-anchor="middle" dominant-baseline="middle" font-size="14">10</text>
    <circle cx="75" cy="113" r="15" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="75" y="114" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <circle cx="207" cy="113" r="15" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="207" y="114" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">6</text>
    <circle cx="366" cy="113" r="15" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="366" y="114" text-anchor="middle" dominant-baseline="middle" font-size="14">14</text>
  </svg>
  <figcaption>6 比 8 小，从根向左。6 比 3 大，再向右。</figcaption>
</figure>

访问顺序为「左子树 → 根 → 右子树」时，每个节点前面的键都比它小，因此得到升序序列。这里的有序性也能用来判断树是否合法。判断时递归传递允许的键值范围，可以发现只比较父子时漏掉的错误。例如 8 的左孩子是 3，3 的右孩子是 9，虽然局部看来 `9 > 3`，但 9 仍位于 8 的左子树。

## 2. 操作和复杂度

| 操作 | 做法 | 时间复杂度 |
| --- | --- | --- |
| 查找 | 比根小向左，比根大向右 | $O(h)$ |
| 插入 | 按查找路线走到空孩子位置 | $O(h)$ |
| 最小值、最大值 | 一直向左、一直向右 | $O(h)$ |
| 前驱、后继 | 边走边保留最近的较小或较大候选 | $O(h)$ |
| 删除 | 找到键，再按孩子数量调整 | $O(h)$ |
| 中序遍历 | 左、根、右依次遍历 | $O(n)$ |

$h$ 是树高。依次插入 `1、2、3、4` 会得到一条只有右孩子的链，$h$ 可达到 $n$。因此普通 BST 的操作没有稳定的对数复杂度，递归深度也可能达到 $n$。

### 删除节点的三种情况

1. **没有孩子。** 删除这个节点，父节点原来指向它的位置置空。
2. **只有一个孩子。** 让父节点直接连到那个孩子。
3. **有两个孩子。** 找右子树里最小的键作为后继，用它替换当前键。再从原位置删除后继。后继是右子树最左侧的节点，因此没有左孩子，只需处理前两种情况。

例如删掉根 8，右子树最小值为 10，就把根键改为 10，再删原来的 10。即使原来的 10 还有右孩子，该孩子也能接回 10 原来的位置，树仍然有序。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 166" role="img" aria-label="删除有两个孩子的根并接回后继的右孩子" fill="currentColor">
    <text x="103" y="12" text-anchor="middle" dominant-baseline="middle" font-size="13">删除 8 前</text>
    <text x="323" y="12" text-anchor="middle" dominant-baseline="middle" font-size="13">替换并删除原后继后</text>
    <path d="M94 49 L65 71" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <path d="M114 49 L141 71" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <path d="M142 86 L125 103" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M160 86 L179 103" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <path d="M124 120 L137 136" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <circle cx="104" cy="42" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="104" y="43" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">8</text>
    <circle cx="55" cy="78" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="55" y="79" text-anchor="middle" dominant-baseline="middle" font-size="14">3</text>
    <circle cx="151" cy="78" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="151" y="79" text-anchor="middle" dominant-baseline="middle" font-size="12">12</text>
    <circle cx="116" cy="111" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="116" y="112" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700">10</text>
    <circle cx="188" cy="111" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="188" y="112" text-anchor="middle" dominant-baseline="middle" font-size="12">14</text>
    <circle cx="145" cy="145" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="145" y="146" text-anchor="middle" dominant-baseline="middle" font-size="12">11</text>
    <path d="M201 62 L238 62" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M232 58 L238 62 L232 66" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-width="1.6"/>
    <path d="M311 49 L282 71" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <path d="M331 49 L358 71" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <path d="M359 86 L342 103" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M377 86 L396 103" fill="none" stroke="currentColor" stroke-opacity=".65" stroke-width="1.4"/>
    <circle cx="321" cy="42" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="321" y="43" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700">10</text>
    <circle cx="272" cy="78" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="272" y="79" text-anchor="middle" dominant-baseline="middle" font-size="14">3</text>
    <circle cx="368" cy="78" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="368" y="79" text-anchor="middle" dominant-baseline="middle" font-size="12">12</text>
    <circle cx="333" cy="111" r="12" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="333" y="112" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700">11</text>
    <circle cx="405" cy="111" r="12" fill="none" stroke="currentColor" stroke-opacity=".53"/>
    <text x="405" y="112" text-anchor="middle" dominant-baseline="middle" font-size="12">14</text>
  </svg>
  <figcaption>10 移到根位置，原位置由它的右孩子 11 接替。</figcaption>
</figure>

## 3. C++ 手写模板

STL 没有暴露节点结构的普通 BST 容器。下面用 `unique_ptr` 托管节点。`lower_bound(x)` 找最小的键 $y$，且 $y\ge x$。往左走前记下当前满足条件的候选。

```cpp
#include <memory>
#include <optional>
#include <utility>

class BST {
    struct Node {
        int key;
        std::unique_ptr<Node> left, right;
        explicit Node(int x) : key(x) {}
    };
    using Link = std::unique_ptr<Node>;
    Link root;

    static void insert(Link& node, int key) {
        if (!node) node = std::make_unique<Node>(key);
        else if (key < node->key) insert(node->left, key);
        else if (key > node->key) insert(node->right, key);
    }

    static void erase(Link& node, int key) {
        if (!node) return;
        if (key < node->key) {
            erase(node->left, key);
        } else if (key > node->key) {
            erase(node->right, key);
        } else if (node->left && node->right) {
            Link* next = &node->right;
            while ((*next)->left) next = &(*next)->left;
            node->key = (*next)->key;
            auto old = std::move(*next);
            *next = std::move(old->right);
        } else {
            auto old = std::move(node);
            node = old->left ? std::move(old->left) : std::move(old->right);
        }
    }

public:
    void insert(int key) { insert(root, key); }
    void erase(int key) { erase(root, key); }

    std::optional<int> lower_bound(int x) const {
        std::optional<int> best;
        for (const Node* p = root.get(); p;) {
            if (p->key < x) {
                p = p->right.get();
            } else {
                best = p->key;
                p = p->left.get();
            }
        }
        return best;
    }

    bool contains(int x) const {
        auto key = lower_bound(x);
        return key && *key == x;
    }
};
```

## 4. 应用和选型

- 给定节点关系，检查一棵树是否是 BST，或在 BST 上做中序遍历和节点删除。
- 给定一段插入顺序，推导最终树形、搜索路径或树高。
- 若题目只要求动态维护有序键、查前驱或后继，竞赛里通常使用 `std::set` 获得 $O(\log n)$ 保证。
- 若题目要求排名、第 $k$ 小或子树区间统计，需要额外保存子树大小等信息，并考虑如何保持平衡。

## 5. 验证和区间遍历

验证 BST 时，每个节点从所有祖先继承开区间 `(lo, hi)`。往左把上界改为当前键，往右把下界改为当前键。可用可空边界，或用比键类型更宽的整数作初始边界，避免把合法的最值键排除。

输出所有落在闭区间 `[L, R]` 的键时，若当前键大于 `L`，左子树才可能有符合条件的键；若当前键小于 `R`，右子树才需要查找。按中序处理即可得到有序输出。访问量是 $O(h+k)$，其中 $k$ 是输出键数。
