---
title: "链表（Linked List）"
excerpt: "单向、双向和循环链表的指针关系、插入删除，以及 list 和 forward_list 的用法。"
---

[← 返回数据结构总览](../)

## 1. 基本概念

链表是一种线性数据结构，由若干结点组成。单向链表的结点有**数据域**和**后继指针**。数据域保存元素值，后继指针 `next` 保存下一个结点的位置。头指针 `head` 给出逻辑序列的起点。

链表的顺序由结点之间的连接决定。只要改动几个连接，就能插入、删除或移动结点。

## 2. 结构与工作原理

### 2.1 数组与链表的存储区别

数组中元素地址满足 `base + i * sizeof(T)`，所以可直接定位下标。动态链表的结点可分开分配。即使结点的值依次是 10、20、30，也只能从头指针沿连接逐个找到它们。

### 2.2 单向链表

`head` 指向第一个结点，`next` 指向后继，末结点的 `next` 为 `nullptr`。空链表的 `head` 同样为 `nullptr`。

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

### 2.3 双向链表

每个结点还保存前驱 `prev`。找到了目标结点，就能用它的两个指针找到两侧结点。维护不带哨兵的链表时，还要处理头、尾和空链表。

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

### 2.4 循环链表

尾结点指向头结点，形成环。有单向和双向两种。遍历通常在回到起点时结束，空链表须先判断。

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

### 2.5 插入结点

在 `A` 和 `C` 之间插入 `B`，先做 `B.next = A.next`，再做 `A.next = B`。如果先覆盖 `A.next`，又没有保存原后继，就会丢失去往 `C` 的连接。

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

### 2.6 删除结点

要删除 `A → B → C` 中的 `B`，先保存 `B` 的位置，再令 `A.next` 指向 `C`。若 `B` 是动态分配的结点，应在完成改接后释放它。双向链表同时将 `C.prev` 改成 `A`。

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

## 3. 基本操作及时间复杂度

| 操作 | 单向链表 | 双向链表 |
| --- | --- | --- |
| 访问首结点 | $O(1)$ | $O(1)$ |
| 按位置访问、按值查找 | 最坏 $O(n)$ | 最坏 $O(n)$ |
| 头插、删除头结点 | $O(1)$ | $O(1)$ |
| 尾插，只有头指针 | $O(n)$ | $O(n)$ |
| 尾插，另有尾指针 | $O(1)$ | $O(1)$ |
| 在已知结点后插入 | $O(1)$ | $O(1)$ |
| 在已知结点前插入 | 最坏 $O(n)$ | $O(1)$ |
| 删除已知结点 | 最坏 $O(n)$ | $O(1)$ |
| 删除已知结点的后继 | $O(1)$ | $O(1)$ |
| 遍历、反转 | $O(n)$ | $O(n)$ |

空间为 $O(n)$，单向结点多存一个指针，双向结点多存两个指针。表中的常数时间操作假设已经拿到需要的结点，或已知目标的前驱。为了找这个位置而进行的遍历仍有开销。

<aside class="ds-note" aria-label="操作位置">
  <p><strong>操作位置。</strong>单向链表删除一个中间结点时，保留它的前驱。仅持有目标结点，通常还要从头查找前驱。</p>
</aside>

## 4. C++ 代码实现

### 4.1 动态单向链表

下面用 `new` 创建结点，用 `delete` 释放结点。`p->next` 表示访问 `p` 所指结点的后继字段。代码使用头指针，删除目标时先检查是否是头结点。

```cpp
#include <iostream>
using namespace std;

struct Node {
    int value;
    Node* next;
};

Node* head = nullptr;

void push_front(int x) {
    head = new Node{x, head};
}

void insert_after(Node* p, int x) {
    if (p) p->next = new Node{x, p->next};
}

Node* find_node(int x) {
    for (Node* p = head; p; p = p->next) {
        if (p->value == x) return p;
    }
    return nullptr;
}

void erase_first(int x) {
    if (!head) return;
    if (head->value == x) {
        Node* old = head;
        head = head->next;
        delete old;
        return;
    }

    Node* p = head;
    while (p->next && p->next->value != x) p = p->next;
    if (p->next) {
        Node* old = p->next;
        p->next = old->next;
        delete old;
    }
}

void print() {
    for (Node* p = head; p; p = p->next) cout << p->value << ' ';
    cout << '\n';
}

int main() {
    push_front(30);
    push_front(20);
    push_front(10);
    print();

    insert_after(find_node(20), 25);
    print();
    erase_first(20);
    print();

    while (head) erase_first(head->value);
}
```

运行结果

```text
10 20 30
10 20 25 30
10 25 30
```

### 4.2 静态链表

可以用数组下标代替指针。`value[i]` 是值，`next_pos[i]` 是后继下标，`-1` 表示没有后继。先插入 30、20、10 到头部时，逻辑顺序是 10、20、30。实际占用下标分别是 2、1、0。

```cpp
#include <iostream>
using namespace std;

const int N = 100005;
int value[N], next_pos[N];
int head = -1, idx = 0;

void push_front(int x) {
    value[idx] = x;
    next_pos[idx] = head;
    head = idx++;
}

void insert_after(int p, int x) {
    value[idx] = x;
    next_pos[idx] = next_pos[p];
    next_pos[p] = idx++;
}

void erase_after(int p) {
    int q = next_pos[p];
    if (q != -1) next_pos[p] = next_pos[q];
}

void print() {
    for (int p = head; p != -1; p = next_pos[p]) cout << value[p] << ' ';
    cout << '\n';
}

int main() {
    push_front(30);
    push_front(20);
    push_front(10);
    print();

    insert_after(1, 25);  // 下标 1 存的是 20
    print();
    erase_after(1);
    print();
}
```

运行结果

```text
10 20 30
10 20 25 30
10 20 30
```

这个版本每次插入占用一个新下标，删除只修改连接。数组容量要覆盖**累计插入次数**。

## 5. STL 中的对应容器

| 容器 | 结构 | 头文件 |
| --- | --- | --- |
| `list` | 双向链表 | `<list>` |
| `forward_list` | 单向链表 | `<forward_list>` |

### 5.1 `list`

| 成员 | 作用 | 复杂度 |
| --- | --- | --- |
| `push_front`、`push_back` | 头尾插入 | $O(1)$ |
| `pop_front`、`pop_back` | 删除首尾元素 | $O(1)$ |
| `insert(it,x)`、`erase(it)` | 在指定位置前插入、删除指定结点 | $O(1)$ |
| `remove(x)` | 删除所有等于 `x` 的元素 | $O(n)$ |
| `reverse()`、`sort()` | 反转、排序 | $O(n)$、$O(n\log n)$ |

`list` 的迭代器支持 `++` 和 `--`。需要跨过多个元素时要逐步移动，排序用 `l.sort()`。`erase(it)` 返回下一个有效位置，适合遍历时删除。

```cpp
#include <iostream>
#include <list>
using namespace std;

int main() {
    list<int> l = {10, 20, 30};
    l.push_front(5);
    l.push_back(40);

    auto it = l.begin();
    ++it;                  // it 指向 10
    l.insert(it, 8);
    l.erase(it);
    l.remove(30);

    for (int x : l) cout << x << ' ';
    cout << '\n';
}
```

运行结果

```text
5 8 20 40
```

### 5.2 `forward_list`

`insert_after(it,x)` 与 `erase_after(it)` 操作指定位的后继。`before_begin()` 表示头结点之前的位置，可以把它传给这两个接口。容器没有 `push_back()` 或 `size()`。

```cpp
#include <forward_list>
#include <iostream>
using namespace std;

int main() {
    forward_list<int> a = {10, 20, 30};
    auto first = a.begin();
    a.insert_after(first, 15);
    a.erase_after(first);
    a.insert_after(a.before_begin(), 5);

    for (int x : a) cout << x << ' ';
    cout << '\n';
}
```

运行结果

```text
5 10 20 30
```

## 6. 典型应用场景

### 6.1 改接顺序与其他结构

- 频繁移动已知结点时，使用链表可避免成段移动元素。
- 用头尾指针组织队列，用链地址法组织哈希桶。
- LRU 缓存中，双向链表记录访问先后，哈希表提供结点定位。命中后把结点移到最前，容量满时淘汰最后一项。用 `list::splice` 移动单个结点时，只需改接几个链接，配合哈希查找，访问和更新的平均耗时均为 $O(1)$。

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

### 6.2 链式前向星

存图时，每个顶点维护自己的出边表头 `head[u]`。加入一条边时，记录终点和权值，并让新边的后继指向旧表头。遍历顶点 `u` 的出边，从 `head[u]` 沿 `next_pos` 访问即可。无向图的每条边要按两个方向加入。

### 6.3 洛谷例题

| 题目 | 练习点 |
| --- | --- |
| [洛谷 P1996 约瑟夫问题](https://www.luogu.com.cn/problem/P1996) | 循环访问和出圈模拟 |
| [洛谷 P1160 队列安排](https://www.luogu.com.cn/problem/P1160) | 在给定人的两侧插入，按身份删除 |

## 7. 优点与局限性

| 比较项目 | 数组 | 动态链表 |
| --- | --- | --- |
| 按下标访问 | $O(1)$ | 最坏 $O(n)$ |
| 中间插入或删除 | 保序时最坏 $O(n)$ | 已知必要结点时 $O(1)$ |
| 内存布局 | 连续 | 结点可分散 |
| 额外存储 | 通常较小 | 每结点存一个或多个链接 |

链表的优势在于灵活改接和已知位置时的快速修改。若题目主要是读写下标、二分或顺序扫描，数组通常更直接。动态链表还要管理空指针、已经释放的指针和结点所有权。
