---
title: "字典树（Trie）"
excerpt: "字典树的前缀共享、单词结束标记，以及插入、整词查询和前缀查询。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

字典树（Trie）把字符串按字符存到树上。根表示空串，每条边带一个字符。从根到某个结点的路径表示一个前缀。多串共享的前缀只保存一次。

## 2. 结构与工作原理

### 2.1 逐字符插入

插入 `cat` 时，依次走 `c`、`a`、`t`，缺少的边就在当前位置创建。插入 `car` 时，`c` 和 `a` 已经存在，只需在 `a` 之后增加 `r`。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 133" role="img" aria-label="单词 cat 和 car 共享前缀 ca" fill="currentColor">
    <path d="M64 67 L120 67" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M151 67 L207 67" fill="none" stroke="currentColor" stroke-opacity=".72" stroke-width="1.5"/>
    <path d="M235 58 L298 35" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <path d="M235 76 L298 100" fill="none" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1" stroke-width="2"/>
    <circle cx="48" cy="67" r="15" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="48" y="68" text-anchor="middle" dominant-baseline="middle" font-size="14">根</text>
    <circle cx="135" cy="67" r="14" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="135" y="68" text-anchor="middle" dominant-baseline="middle" font-size="14"></text>
    <circle cx="222" cy="67" r="14" fill="none" stroke="currentColor" stroke-opacity=".48"/>
    <text x="222" y="68" text-anchor="middle" dominant-baseline="middle" font-size="14"></text>
    <circle cx="313" cy="31" r="14" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="313" y="32" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700"></text>
    <circle cx="313" cy="104" r="14" fill="color-mix(in srgb, #2c9b86 22%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="313" y="105" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700"></text>
    <text x="94" y="48" text-anchor="middle" dominant-baseline="middle" font-size="14">c</text>
    <text x="180" y="48" text-anchor="middle" dominant-baseline="middle" font-size="14">a</text>
    <text x="267" y="33" text-anchor="middle" dominant-baseline="middle" font-size="14">t</text>
    <text x="267" y="104" text-anchor="middle" dominant-baseline="middle" font-size="14">r</text>
    <text x="336" y="31" text-anchor="start" dominant-baseline="middle" font-size="14" font-weight="700">cat</text>
    <text x="336" y="104" text-anchor="start" dominant-baseline="middle" font-size="14" font-weight="700">car</text>
  </svg>
  <figcaption>两词共享 c → a，标亮的节点是单词结尾。</figcaption>
</figure>

### 2.2 整词与前缀

找到路径只说明前缀存在。还需要在词尾保存结束标记，才能识别整词。假如插入 `car` 和 `cart`，`car` 同时是完整词，也是另一个词的前缀。仅把叶结点当作词尾就会漏掉它。

### 2.3 重复词和前缀计数

若希望统计重复词，可把结束标记变成 `terminal` 计数。另给每个结点维护 `pass`，插入时把沿路经过的计数都加一。以后统计一个前缀有多少个单词，只需要读取对应结点的 `pass`。

<figure class="ds-figure">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 145" role="img" aria-label="字典树的前缀计数和完整单词计数" fill="currentColor">
    <text x="173" y="12" text-anchor="middle" dominant-baseline="middle" font-size="13" opacity=".72">pass</text>
    <text x="246" y="12" text-anchor="middle" dominant-baseline="middle" font-size="13" opacity=".72">terminal</text>
    <text x="14" y="38" text-anchor="start" dominant-baseline="middle" font-size="13">前缀 ca</text>
    <rect x="136" y="24" width="73" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="172.5" y="38.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">4</text>
    <rect x="209" y="24" width="73" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="245.5" y="38.5" text-anchor="middle" dominant-baseline="middle" font-size="14">0</text>
    <text x="14" y="68" text-anchor="start" dominant-baseline="middle" font-size="13">前缀 car</text>
    <rect x="136" y="54" width="73" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="172.5" y="68.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">3</text>
    <rect x="209" y="54" width="73" height="27" rx="5" fill="color-mix(in srgb, #2c9b86 21%, transparent)" stroke="color-mix(in srgb, #2c9b86 70%, currentColor)" stroke-opacity="1"/>
    <text x="245.5" y="68.5" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700">2</text>
    <text x="14" y="98" text-anchor="start" dominant-baseline="middle" font-size="13">前缀 cart</text>
    <rect x="136" y="84" width="73" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="172.5" y="98.5" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <rect x="209" y="84" width="73" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="245.5" y="98.5" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <text x="14" y="128" text-anchor="start" dominant-baseline="middle" font-size="13">前缀 cat</text>
    <rect x="136" y="114" width="73" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="172.5" y="128.5" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
    <rect x="209" y="114" width="73" height="27" rx="5" fill="none" stroke="currentColor" stroke-opacity=".44"/>
    <text x="245.5" y="128.5" text-anchor="middle" dominant-baseline="middle" font-size="14">1</text>
  </svg>
  <figcaption>插入 car、cart、cat、car 后，car 的前缀计数为 3，完整单词计数为 2。</figcaption>
</figure>

## 3. 基本操作及时间复杂度

| 操作 | 时间复杂度 |
| --- | --- |
| 插入一个长为 `L` 的单词 | $O(L)$ |
| 查询整词是否存在 | $O(L)$ |
| 查询前缀是否存在或计数 | $O(L)$ |
| 计数版删除一个单词 | $O(L)$，先确认单词存在 |

设有 `m` 个结点，字母表大小为 $\sigma$。每结点开一整个孩子数组需要 $O(m\sigma)$ 空间。所有插入串的总长度是 `S` 时，最多创建 `S+1` 个结点。

<aside class="ds-note" aria-label="字母下标">
  <p><strong>字母下标。</strong><code>ch - 'a'</code> 只适用于小写字母的映射。扩展到数字和大小写时，要为不同字符分配不同下标。</p>
</aside>

## 4. C++ 代码实现

下面的字母表是 `a` 到 `z`，用长度为 26 的数组存孩子下标。结点 0 是根，孩子下标为 0 表示无边。`walk` 查不到路径时返回 `-1`，查询整词时还要检查 `end`。

```cpp
#include <iostream>
#include <string>
#include <vector>
using namespace std;

struct Node {
    int next[26]{};
    bool end = false;
};

vector<Node> trie(1);

void insert(const string& s) {
    int p = 0;
    for (char ch : s) {
        int c = ch - 'a';
        if (trie[p].next[c] == 0) {
            trie.push_back({});
            trie[p].next[c] = int(trie.size()) - 1;
        }
        p = trie[p].next[c];
    }
    trie[p].end = true;
}

int walk(const string& s) {
    int p = 0;
    for (char ch : s) {
        p = trie[p].next[ch - 'a'];
        if (p == 0) return -1;
    }
    return p;
}

int main() {
    insert("cat");
    insert("car");

    int p = walk("cat");
    cout << (p != -1 && trie[p].end) << '\n';

    p = walk("ca");
    cout << (p != -1 && trie[p].end) << '\n';
    cout << (p != -1) << '\n';
}
```

运行结果

```text
1
0
1
```

删除计数版单词时，确认它有出现过，再沿路径把 `pass` 以及词尾 `terminal` 各减一。可以先保留这些结点，避免同时处理内存回收。

## 5. STL 中的对应容器

STL 没有字典树容器。小字母表可用数组保存孩子，动态增加结点可以用 `vector`。字母表较大、结点分支很少时，也可以只用 `map` 或 `unordered_map` 保存实际存在的边。

## 6. 典型应用场景

### 6.1 典型用法

- 词典、词频和前缀计数。
- 01 Trie。把整数从高位到低位存入，异或最大值优先争取高位为 1。
- 作为 AC 自动机的基础。多条模式串先建 Trie，再建立失配跳转。

### 6.2 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 P8306 字典树 / Trie](https://www.luogu.com.cn/problem/P8306) | 维护前缀计数，按题目字符集设计下标映射 |

## 7. 优点与局限性

Trie 适合大量共享前缀的查询，查找工作量与字符串长度有关。固定数组版每个结点的存储会随字母表扩大。若只做完整键的精确匹配，哈希表即可。
