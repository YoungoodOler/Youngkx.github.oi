---
title: "二叉搜索树（Binary Search Tree）"
excerpt: "二叉搜索树的有序性质、插入查找和三种删除情况。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

二叉搜索树（BST）给二叉树增加了键的顺序。对每个结点，左子树的所有键更小，右子树的所有键更大。这里把相同键合并处理，每种键只保留一份。

## 2. 结构与工作原理

### 2.1 搜索、插入和中序遍历

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

查找 6 时，比根 8 小就向左，比 3 大再向右。插入沿相同规则走到空位置。中序遍历先访问左子树，再访问当前键和右子树，因此输出有序。

顺序条件作用于整棵子树。例如 9 即使比父结点 3 大，只要它位于 8 的左子树中，仍然破坏了 BST 的限制。验证时可以沿路径传递键允许出现的上下界。

### 2.2 删除结点

1. 没有孩子时直接断开。
2. 只有一个孩子时，用孩子顶替原位置。
3. 有两个孩子时，取右子树最小键替换当前键，再在右子树删掉原先存放该键的结点。那个结点没有左孩子，可按前两种情况处理。

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

### 2.3 前驱和后继

查严格小于 `x` 的最大键时，遇到小于 `x` 的键先记作候选，再向右找是否存在更接近的值。查严格大于 `x` 的最小键时对称操作。

## 3. 基本操作及时间复杂度

| 操作 | 时间复杂度 |
| --- | --- |
| 查找、插入、删除 | $O(h)$ |
| 找最小、最大、前驱、后继 | $O(h)$ |
| 中序遍历全部结点 | $O(n)$ |

$h$ 是树高。普通 BST 可能退化为链，例如升序插入时单次操作最坏为 $O(n)$。结点存储空间为 $O(n)$，递归实现还会占用最多 $O(h)$ 的调用栈。

<aside class="ds-note" aria-label="更新子树的根">
  <p><strong>更新子树的根。</strong>删除根或把只有一个孩子的结点替换掉时，根的下标会变。调用方写成 <code>root = erase(root, x)</code>。</p>
</aside>

## 4. C++ 代码实现

用数组下标记录左右孩子，`0` 表示空结点。插入和删除返回该子树操作后的根，因此调用方要用这个返回值更新原连接。示例中检查键 6，再删除原根 8，并打印两次中序结果。

删除只改接下标。这个教学版本保留被删除的数组槽位，结点数组的长度与累计创建次数有关。

```cpp
#include <iostream>
#include <vector>
using namespace std;

struct Node {
    int key, left = 0, right = 0;
};

vector<Node> tree(1);

int insert(int p, int x) {
    if (p == 0) {
        tree.push_back({x});
        return int(tree.size()) - 1;
    }
    if (x < tree[p].key) {
        int child = insert(tree[p].left, x);
        tree[p].left = child;
    } else if (x > tree[p].key) {
        int child = insert(tree[p].right, x);
        tree[p].right = child;
    }
    return p;
}

bool contains(int p, int x) {
    while (p && tree[p].key != x) {
        p = x < tree[p].key ? tree[p].left : tree[p].right;
    }
    return p != 0;
}

int erase(int p, int x) {
    if (p == 0) return 0;
    if (x < tree[p].key) tree[p].left = erase(tree[p].left, x);
    else if (x > tree[p].key) tree[p].right = erase(tree[p].right, x);
    else {
        if (!tree[p].left) return tree[p].right;
        if (!tree[p].right) return tree[p].left;
        int q = tree[p].right;
        while (tree[q].left) q = tree[q].left;
        tree[p].key = tree[q].key;
        tree[p].right = erase(tree[p].right, tree[q].key);
    }
    return p;
}

void inorder(int p) {
    if (!p) return;
    inorder(tree[p].left);
    cout << tree[p].key << ' ';
    inorder(tree[p].right);
}

int main() {
    int root = 0;
    int a[] = {8, 3, 12, 1, 6, 10, 14, 11};
    for (int x : a) root = insert(root, x);

    cout << contains(root, 6) << '\n';
    inorder(root);
    cout << '\n';

    root = erase(root, 8);
    inorder(root);
    cout << '\n';
}
```

运行结果

```text
1
1 3 6 8 10 11 12 14
1 3 6 10 11 12 14
```

## 5. STL 中的对应容器

STL 没有暴露结点和普通 BST 树形的容器。若题目只需要有序集合的接口，`set` 支持查找、插入、删除和有序遍历；`lower_bound` 与 `upper_bound` 能定位边界。题目要求输出插入顺序形成的树形时，需要按指定规则建树。

## 6. 典型应用场景

### 6.1 典型用法

按序遍历、查询前驱后继，或用给定插入序列还原树形。若要查询排名或第 `k` 小，可在每个结点维护子树大小，沿顺序比较时累加被跳过的左子树。

### 6.2 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 SP3544 BST - Binary Search Tree](https://www.luogu.com.cn/problem/SP3544) | 按给定顺序建立 BST，统计每次插入后累计访问过的结点数 |

直接建树能看清计数过程。若有序输入使树退化，逐个走到插入位置会很慢。只需求深度时，可以在已插入的键中找新键的前驱和后继。两者都存在时，其中较深的结点是新键的父结点。它们之间没有其他已插入的键，两者的最近公共祖先必然是两者之一。

## 7. 优点与局限性

普通 BST 的规则简单，结点可逐步扩展，且便于观察搜索路径。输入顺序会直接影响树形和运行时间；数据规模较大、顺序不受控时，可使用具有高度保证的平衡树或 STL 有序容器。
