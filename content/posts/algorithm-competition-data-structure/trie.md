---
title: "字典树（Trie）"
excerpt: "讲解前缀路径、终止计数和子树计数，给出支持重复词与删除的模板。"
---

[← 返回数据结构总览](../)

## 1. 一条路径表示一个前缀

根表示空串，每条边表示一个字符。从根走出三条边 `c → a → t` 就得到路径 `cat`。`cat` 和 `car` 共用 `ca`，从下一个字符开始分叉。前缀存在只说明路径有匹配的单词。判断一个完整单词是否出现过，还要检查路径末端的终止标记或计数。

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

插入 `car`、`cart`、`cat` 后，`ca` 只代表前缀，`car` 同时是单词和另一个单词的前缀。若允许重复插入，用 `terminal` 记录单词出现次数，用 `pass` 记录这个前缀下的单词总数。

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

## 2. 操作和空间

| 操作 | 时间复杂度 | 使用的信息 |
| --- | --- | --- |
| 插入长度为 $L$ 的词 | $O(L)$ | 沿路创建节点并增加计数 |
| 查询完整词次数 | $O(L)$ | 路径末端的 `terminal` |
| 查询前缀次数 | $O(L)$ | 路径末端的 `pass` |
| 删除一个出现的词 | $O(L)$ | 减少路径上的计数和词尾计数 |

上表假设固定字母表且每步直接访问孩子下标。对于 26 个小写英文字母，每个节点存 26 个孩子位置，$M$ 个节点需要 $O(26M)$ 空间。若字母表很大而每个节点只有少量孩子，可以用映射存存在的边，代价是每步访问孩子也要执行一次映射查找。

## 3. C++ 手写模板

输入限小写英文字母。根的下标为 0，新节点下标从 1 开始，所以孩子下标 0 表示这条边尚未创建。下面保留已分配节点，删除仅修改计数，预留路径以后可以复用。

```cpp
#include <array>
#include <string_view>
#include <vector>

class Trie {
    struct Node {
        std::array<int, 26> next{};
        int terminal = 0;
        int pass = 0;
    };
    std::vector<Node> nodes{Node{}};

    int walk(std::string_view s) const {
        int p = 0;
        for (char ch : s) {
            p = nodes[p].next[ch - 'a'];
            if (p == 0) return -1;
        }
        return p;
    }

public:
    void insert(std::string_view word) {
        int p = 0;
        ++nodes[p].pass;
        for (char ch : word) {
            int c = ch - 'a';
            if (nodes[p].next[c] == 0) {
                int child = static_cast<int>(nodes.size());
                nodes.emplace_back();
                nodes[p].next[c] = child;
            }
            p = nodes[p].next[c];
            ++nodes[p].pass;
        }
        ++nodes[p].terminal;
    }

    int count_word(std::string_view word) const {
        int p = walk(word);
        return p == -1 ? 0 : nodes[p].terminal;
    }

    int count_prefix(std::string_view prefix) const {
        int p = walk(prefix);
        return p == -1 ? 0 : nodes[p].pass;
    }

    bool erase_one(std::string_view word) {
        if (count_word(word) == 0) return false;
        int p = 0;
        --nodes[p].pass;
        for (char ch : word) {
            p = nodes[p].next[ch - 'a'];
            --nodes[p].pass;
        }
        --nodes[p].terminal;
        return true;
    }
};
```

保存节点下标后再扩容 `vector`，不要跨 `emplace_back()` 保存节点引用。删除后，路径仍可能存在，因此判断前缀是否还有对应单词应看 `count_prefix(prefix) > 0`。

## 4. 应用和扩展

- **词频和前缀统计。** 插入 `car、cart、cat、car`，`count_word("car")` 为 2，`count_prefix("car")` 为 3。删一次 `car` 后分别为 1 和 2。
- **01 Trie。** 把整数按二进制位从高到低插入。求最大异或值时，在当前位优先走与询问数相反的分支，能把该位的异或设为 1。高级位优先决定整数大小。
- **多模式串匹配。** 字典树可以组织多个模式串。要在一段长文本里同时查找这些模式，可以继续加失败指针，形成 AC 自动机。

## 5. 内存与变体

若所有插入词的总长度为 $S$，最多创建 $S+1$ 个节点，共享的前缀会减少节点数。固定数组实现速度稳定，单个节点的存储开销却会随字母表大小增加。在大字母表或内存紧张时，可用动态存边、压缩只有单个孩子的路径，或者提前估算并预留节点池。

<aside class="ds-note" aria-label="输入范围">
  <p><strong>字符下标。</strong>模板只接受小写英文字母。若题目给了大小写、数字或更大的字符表，先定义字符到下标的映射，再确定分支的存储方式。</p>
</aside>
